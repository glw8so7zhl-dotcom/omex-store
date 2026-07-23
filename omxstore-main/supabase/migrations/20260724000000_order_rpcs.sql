-- =====================================================================
-- OMEX — trusted order/coupon/tracking RPCs (SECURITY DEFINER).
--
-- Moves the trusted commerce logic INTO the database so the app no longer
-- needs the service-role key for core flows (checkout, coupon validation,
-- guest tracking). Pricing always comes from the products table; clients can
-- never influence totals. auth.uid() inside definer functions still reflects
-- the caller's JWT, so signed-in orders keep user attribution automatically.
-- Idempotent (create or replace + guarded grants).
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_order_v1: validates + prices + inserts an order and its items.
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
  _coupon_code text default null
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

  if v_coupon_ok and v_discount > 0 then
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'subtotal', v_subtotal,
    'shipping', v_shipping,
    'discount', v_discount,
    'total', v_total,
    'items', v_lines
  );
end;
$$;

revoke execute on function public.create_order_v1(text,text,text,text,text,text,text,jsonb,text) from public;
grant execute on function public.create_order_v1(text,text,text,text,text,text,text,jsonb,text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- validate_coupon_v1: preview a coupon's discount for a subtotal.
-- ---------------------------------------------------------------------
create or replace function public.validate_coupon_v1(_code text, _subtotal numeric)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_coupon public.coupons%rowtype;
  v_discount numeric(12,2);
begin
  if _code is null or length(trim(_code)) = 0 or _subtotal is null or _subtotal < 0 then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'كود الكوبون غير صحيح');
  end if;

  select * into v_coupon from public.coupons where code = upper(trim(_code));
  if not found then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'كود الكوبون غير صحيح');
  end if;

  if not (v_coupon.is_active
          and (v_coupon.starts_at is null or v_coupon.starts_at <= now())
          and (v_coupon.expires_at is null or v_coupon.expires_at > now())
          and (v_coupon.max_uses is null or v_coupon.used_count < v_coupon.max_uses)) then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'انتهت صلاحية هذا الكوبون');
  end if;

  if _subtotal < coalesce(v_coupon.min_subtotal, 0) then
    return jsonb_build_object('valid', false, 'discount', 0, 'message', 'هذا الكوبون يتطلب حداً أدنى للطلب');
  end if;

  if v_coupon.discount_type = 'percent' then
    v_discount := round(_subtotal * v_coupon.discount_value / 100);
  else
    v_discount := least(_subtotal, round(v_coupon.discount_value));
  end if;

  return jsonb_build_object('valid', true, 'discount', v_discount, 'message', 'تم تطبيق الكوبون بنجاح');
end;
$$;

revoke execute on function public.validate_coupon_v1(text, numeric) from public;
grant execute on function public.validate_coupon_v1(text, numeric) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- track_order_v1: guest order tracking (order uuid + phone last-4).
-- Returns only non-sensitive fields.
-- ---------------------------------------------------------------------
create or replace function public.track_order_v1(_order_id uuid, _phone_last4 text)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_items jsonb;
begin
  if _order_id is null or _phone_last4 is null or _phone_last4 !~ '^[0-9]{4}$' then
    return jsonb_build_object('found', false);
  end if;

  select * into v_order from public.orders where id = _order_id;
  if not found or right(regexp_replace(v_order.phone, '\D', '', 'g'), 4) <> _phone_last4 then
    return jsonb_build_object('found', false);
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('product_name', product_name, 'qty', qty, 'line_total', line_total)),
    '[]'::jsonb
  ) into v_items
  from public.order_items where order_id = v_order.id;

  return jsonb_build_object(
    'found', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'status', v_order.status,
      'created_at', v_order.created_at,
      'payment_method', v_order.payment_method,
      'subtotal', v_order.subtotal,
      'shipping', v_order.shipping,
      'discount', v_order.discount,
      'total', v_order.total,
      'items', v_items
    )
  );
end;
$$;

revoke execute on function public.track_order_v1(uuid, text) from public;
grant execute on function public.track_order_v1(uuid, text) to anon, authenticated, service_role;
