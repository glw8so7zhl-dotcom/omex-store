-- =====================================================================
-- OMEX — Loyalty points ("نقاط OMEX"): 1% real cashback.
--
-- Rules (server-authoritative, all inside Postgres):
--   EARN:   every DELIVERED order earns floor(total / 1000) points,
--           credited to the order's signed-in user (guests earn nothing —
--           which drives account signups).
--   REDEEM: 1 point = 10 YER off at checkout. create_order_v1 validates
--           the caller's real balance and caps redemption at the payable
--           subtotal; the client can never mint discounts.
--   SAFETY: full audit ledger (no client writes), delivery reversal takes
--           earned points back, cancellation refunds redeemed points,
--           un-cancelling re-takes them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Audit ledger — the single source of truth for balances.
-- ---------------------------------------------------------------------
create table if not exists public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  points int not null,
  reason text not null check (reason in (
    'earn_delivered', 'earn_reversed',
    'redeem_checkout', 'redeem_refunded', 'redeem_retaken',
    'admin_adjust'
  )),
  created_at timestamptz not null default now()
);

create index if not exists idx_loyalty_user on public.loyalty_ledger (user_id, created_at desc);
create index if not exists idx_loyalty_order on public.loyalty_ledger (order_id);

alter table public.loyalty_ledger enable row level security;

-- Users read their own history; admins read everything. NO client writes:
-- only SECURITY DEFINER functions move points.
drop policy if exists loyalty_select_own_or_admin on public.loyalty_ledger;
create policy loyalty_select_own_or_admin on public.loyalty_ledger
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role));

create or replace function public.loyalty_balance(_user uuid)
returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(points), 0)::int from public.loyalty_ledger where user_id = _user;
$$;

revoke execute on function public.loyalty_balance(uuid) from public;
grant execute on function public.loyalty_balance(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Earn / reverse / refund — driven by order status changes.
-- ---------------------------------------------------------------------
create or replace function public.on_order_loyalty()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_earn_net int;
  v_earned int;
  v_fam_sum int;
  v_original int;
  v_outstanding int;
  v_balance int;
begin
  if new.user_id is null or new.status = old.status then return new; end if;

  -- EARN on delivery (idempotent via the net of prior earn entries).
  if new.status = 'delivered' and old.status <> 'delivered' then
    select coalesce(sum(points), 0) into v_earn_net from public.loyalty_ledger
     where order_id = new.id and reason in ('earn_delivered', 'earn_reversed');
    v_earned := floor(new.total / 1000)::int;
    if v_earned > 0 and v_earn_net <= 0 then
      insert into public.loyalty_ledger (user_id, order_id, points, reason)
      values (new.user_id, new.id, v_earned, 'earn_delivered');
      v_balance := public.loyalty_balance(new.user_id);
      insert into public.notifications (user_id, title, body, link)
      values (
        new.user_id,
        'كسبت ' || v_earned || ' نقطة 🎁',
        'من طلبك #' || substr(new.id::text, 1, 8) || ' — رصيدك الآن ' || v_balance ||
          ' نقطة (= خصم ' || to_char(v_balance * 10, 'FM999,999,990') || ' ر.ي).',
        '/account'
      );
    end if;
  end if;

  -- REVERSE the earn if delivery is undone.
  if old.status = 'delivered' and new.status <> 'delivered' then
    select coalesce(sum(points), 0) into v_earn_net from public.loyalty_ledger
     where order_id = new.id and reason in ('earn_delivered', 'earn_reversed');
    if v_earn_net > 0 then
      insert into public.loyalty_ledger (user_id, order_id, points, reason)
      values (new.user_id, new.id, -v_earn_net, 'earn_reversed');
    end if;
  end if;

  -- REFUND outstanding redeemed points on cancellation.
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    select coalesce(sum(points), 0) into v_fam_sum from public.loyalty_ledger
     where order_id = new.id
       and reason in ('redeem_checkout', 'redeem_refunded', 'redeem_retaken');
    v_outstanding := -v_fam_sum;
    if v_outstanding > 0 then
      insert into public.loyalty_ledger (user_id, order_id, points, reason)
      values (new.user_id, new.id, v_outstanding, 'redeem_refunded');
      insert into public.notifications (user_id, title, body, link)
      values (
        new.user_id,
        'أُعيدت نقاطك 💫',
        'استرجعت ' || v_outstanding || ' نقطة من الطلب الملغى #' || substr(new.id::text, 1, 8) || '.',
        '/account'
      );
    end if;
  end if;

  -- RE-TAKE refunded redeems if the order is un-cancelled.
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    select coalesce(sum(points), 0) into v_fam_sum from public.loyalty_ledger
     where order_id = new.id
       and reason in ('redeem_checkout', 'redeem_refunded', 'redeem_retaken');
    select coalesce(-sum(points), 0) into v_original from public.loyalty_ledger
     where order_id = new.id and reason = 'redeem_checkout';
    if v_original > (-v_fam_sum) then
      insert into public.loyalty_ledger (user_id, order_id, points, reason)
      values (new.user_id, new.id, -(v_original + v_fam_sum), 'redeem_retaken');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_order_loyalty on public.orders;
create trigger trg_order_loyalty
  after update of status on public.orders
  for each row
  execute function public.on_order_loyalty();

-- ---------------------------------------------------------------------
-- create_order_v1 (v3): adds _redeem_points. The 9-arg overload must be
-- dropped first so PostgREST named-arg resolution stays unambiguous.
-- ---------------------------------------------------------------------
drop function if exists public.create_order_v1(text,text,text,text,text,text,text,jsonb,text);

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

  -- price every line from the DB (never trust the client)
  for v_item in
    select p.slug, p.name, p.price, (e->>'qty')::int as qty
    from jsonb_array_elements(_items) e
    join public.products p on p.slug = e->>'product_id' and p.is_active
  loop
    if v_item.qty is null or v_item.qty < 1 or v_item.qty > 999 then raise exception 'invalid_qty'; end if;
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
