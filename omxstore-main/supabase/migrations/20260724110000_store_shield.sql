-- =====================================================================
-- OMEX — Store Shield: production hardening for the order pipeline.
--
-- Closes three real gaps found in review:
--   1) OVERSELLING: create_order_v1 accepted any qty (1..999) without
--      checking stock — ordering 999 of a 24-stock item was possible.
--      Now every line must fit the live stock ('insufficient_stock').
--   2) ORDER FLOODING: nothing limited order creation — a hostile loop
--      could zero all inventory with fake orders and flood the admin
--      bell. Now: max 3 non-cancelled orders per phone per hour
--      ('rate_limited'). Cancelled orders free the quota.
--   3) QUESTION SPAM: a user could pile up unlimited pending questions.
--      Now capped at 5 awaiting-answer questions per user.
-- =====================================================================

create index if not exists idx_orders_created_at on public.orders (created_at desc);

-- ---------------------------------------------------------------------
-- create_order_v1 (v4): same signature — adds stock validation + rate
-- limiting on top of v3 (loyalty redemption etc. unchanged).
-- ---------------------------------------------------------------------
create or replace function public.create_order_v1(
  _customer_name text,
  _phone text,
  _governorate text,
  _city text,
  _address text,
  _notes text,
  _payment_method text,
  _items jsonb,
  _coupon_code text default null,
  _redeem_points int default 0
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_subtotal numeric(12,2) := 0;
  v_shipping numeric(12,2) := 3000;
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2);
  v_order_id uuid;
  v_coupon public.coupons%rowtype;
  v_coupon_ok boolean := false;
  v_item record;
  v_lines jsonb := '[]'::jsonb;
  v_redeem int := coalesce(_redeem_points, 0);
  v_points_discount numeric(12,2) := 0;
  v_balance int;
  v_phone_digits text;
begin
  -- input validation (server-authoritative)
  if _customer_name is null or length(trim(_customer_name)) < 2 or length(_customer_name) > 120 then
    raise exception 'invalid_name';
  end if;
  if _phone is null or length(regexp_replace(_phone, '\D', '', 'g')) < 7 or length(_phone) > 20 then
    raise exception 'invalid_phone';
  end if;
  if _governorate is null or length(trim(_governorate)) < 2 then raise exception 'invalid_governorate'; end if;
  if _city is null or length(trim(_city)) < 2 or length(_city) > 120 then raise exception 'invalid_city'; end if;
  if _address is null or length(trim(_address)) < 5 or length(_address) > 500 then raise exception 'invalid_address'; end if;
  if _payment_method not in ('cod', 'bank_transfer') then raise exception 'invalid_payment'; end if;
  if _items is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'empty_cart';
  end if;
  if jsonb_array_length(_items) > 50 then raise exception 'too_many_items'; end if;
  if v_redeem < 0 or v_redeem > 1000000 then raise exception 'invalid_points'; end if;

  -- SHIELD: rate limit — max 3 live orders per phone per hour.
  v_phone_digits := regexp_replace(trim(_phone), '\D', '', 'g');
  if (
    select count(*)
    from public.orders o
    where regexp_replace(coalesce(o.phone, ''), '\D', '', 'g') = v_phone_digits
      and o.created_at > now() - interval '1 hour'
      and o.status <> 'cancelled'
  ) >= 3 then
    raise exception 'rate_limited';
  end if;

  -- price every line from the DB (never trust the client)
  for v_item in
    select p.slug, p.name, p.price, p.stock, (e->>'qty')::int as qty
    from jsonb_array_elements(_items) e
    join public.products p on p.slug = e->>'product_id' and p.is_active
  loop
    if v_item.qty is null or v_item.qty < 1 or v_item.qty > 999 then raise exception 'invalid_qty'; end if;
    -- SHIELD: never sell more than the live stock.
    if v_item.qty > coalesce(v_item.stock, 0) then
      raise exception 'insufficient_stock';
    end if;
    v_subtotal := v_subtotal + v_item.price * v_item.qty;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_item.slug,
      'product_name', v_item.name,
      'unit_price', v_item.price,
      'qty', v_item.qty,
      'line_total', v_item.price * v_item.qty
    );
  end loop;

  if jsonb_array_length(v_lines) = 0 then raise exception 'unknown_product'; end if;
  if jsonb_array_length(v_lines) <> jsonb_array_length(_items) then raise exception 'unknown_product'; end if;

  -- coupon (same rules as validate_coupon_v1)
  if _coupon_code is not null and length(trim(_coupon_code)) > 0 then
    select * into v_coupon from public.coupons where code = upper(trim(_coupon_code));
    if found
       and v_coupon.is_active
       and (v_coupon.starts_at is null or v_coupon.starts_at <= now())
       and (v_coupon.expires_at is null or v_coupon.expires_at > now())
       and (v_coupon.max_uses is null or v_coupon.used_count < v_coupon.max_uses)
       and v_subtotal >= coalesce(v_coupon.min_subtotal, 0) then
      v_coupon_ok := true;
      if v_coupon.discount_type = 'percent' then
        v_discount := round(v_subtotal * v_coupon.discount_value / 100);
      else
        v_discount := least(v_subtotal, round(v_coupon.discount_value));
      end if;
    end if;
  end if;

  -- loyalty redemption (1 point = 10 YER), server-validated + capped
  if v_redeem > 0 then
    if v_user_id is null then raise exception 'points_require_account'; end if;
    v_balance := public.loyalty_balance(v_user_id);
    if v_balance < v_redeem then raise exception 'insufficient_points'; end if;
    v_redeem := least(v_redeem, floor(greatest(0, v_subtotal - v_discount) / 10)::int);
    v_points_discount := v_redeem * 10;
    v_discount := v_discount + v_points_discount;
  end if;

  if v_subtotal <= 0 then v_shipping := 0; end if;
  v_total := greatest(0, v_subtotal - v_discount + v_shipping);

  insert into public.orders (
    user_id, coupon_id, customer_name, phone, governorate, city, address, notes,
    payment_method, subtotal, shipping, discount, total
  ) values (
    v_user_id,
    case when v_coupon_ok then v_coupon.id end,
    trim(_customer_name), trim(_phone), trim(_governorate), trim(_city), trim(_address),
    nullif(trim(coalesce(_notes, '')), ''),
    _payment_method, v_subtotal, v_shipping, v_discount, v_total
  ) returning id into v_order_id;

  insert into public.order_items (order_id, product_id, product_name, unit_price, qty, line_total)
  select v_order_id, l->>'product_id', l->>'product_name',
         (l->>'unit_price')::numeric, (l->>'qty')::int, (l->>'line_total')::numeric
  from jsonb_array_elements(v_lines) l;

  -- real inventory movement — decrement stock (clamped at 0)
  update public.products p
     set stock = greatest(0, p.stock - s.q)
    from (
      select l->>'product_id' as slug, sum((l->>'qty')::int) as q
      from jsonb_array_elements(v_lines) l
      group by 1
    ) s
   where p.slug = s.slug;

  if v_coupon_ok and v_discount > 0 then
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  -- record the redemption in the audit ledger
  if v_redeem > 0 and v_points_discount > 0 then
    insert into public.loyalty_ledger (user_id, order_id, points, reason)
    values (v_user_id, v_order_id, -v_redeem, 'redeem_checkout');
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'subtotal', v_subtotal,
    'shipping', v_shipping,
    'discount', v_discount,
    'total', v_total,
    'points_redeemed', v_redeem,
    'points_discount', v_points_discount,
    'items', v_lines
  );
end;
$$;

revoke execute on function public.create_order_v1(text,text,text,text,text,text,text,jsonb,text,int) from public;
grant execute on function public.create_order_v1(text,text,text,text,text,text,text,jsonb,text,int)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Question flood guard: max 5 awaiting-answer questions per user.
-- ---------------------------------------------------------------------
create or replace function public.guard_question_flood()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null and (
    select count(*) from public.product_questions
    where user_id = new.user_id and answer is null
  ) >= 5 then
    raise exception 'too_many_pending_questions';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_question_flood on public.product_questions;
create trigger trg_question_flood
  before insert on public.product_questions
  for each row
  execute function public.guard_question_flood();
