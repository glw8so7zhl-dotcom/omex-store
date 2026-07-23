-- =====================================================================
-- OMEX — Live store operations: order lifecycle notifications + real
-- inventory movement.
--
-- 1) create_order_v1 now DECREMENTS product stock (clamped at 0) — before
--    this, orders never touched inventory (overselling was possible).
-- 2) New order      -> every admin gets a bell notification instantly.
-- 3) Status change  -> the customer (signed-in orders) gets an Arabic
--    notification per status, linking to their orders page.
-- 4) Cancellation   -> items return to stock (and un-cancelling re-takes
--    them). A restock that crosses 0 automatically triggers the existing
--    back-in-stock alerts chain.
-- 5) Stock crossing its low threshold (or hitting 0) -> admins are warned.
--
-- All SECURITY DEFINER (bypasses notifications' admin-only insert RLS the
-- same proven way as process_product_alerts). Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_order_v1 (v2 body): identical trusted logic + stock decrement.
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

  -- NEW: real inventory movement — decrement stock (clamped at 0).
  -- The products stock triggers then fan out automatically (inventory
  -- sync, low-stock admin warnings).
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
-- notify_admins: fan a notification out to every admin account.
-- ---------------------------------------------------------------------
create or replace function public.notify_admins(_title text, _body text, _link text)
returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, link)
  select ur.user_id, _title, _body, _link
  from public.user_roles ur
  where ur.role = 'admin'::app_role;
$$;

-- ---------------------------------------------------------------------
-- New order -> notify admins instantly.
-- ---------------------------------------------------------------------
create or replace function public.on_order_created()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_admins(
    'طلب جديد 🛒',
    coalesce(new.customer_name, 'عميل') || ' — ' ||
      to_char(new.total, 'FM999,999,990') || ' ر.ي (' ||
      case new.payment_method when 'cod' then 'دفع عند الاستلام' else 'تحويل بنكي' end || ')',
    '/admin/orders'
  );
  return new;
end;
$$;

drop trigger if exists trg_order_created on public.orders;
create trigger trg_order_created
  after insert on public.orders
  for each row
  execute function public.on_order_created();

-- ---------------------------------------------------------------------
-- Status change -> stock moves on (un)cancellation + customer notified.
-- ---------------------------------------------------------------------
create or replace function public.on_order_status_change()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_body text;
begin
  if new.status = old.status then return new; end if;

  -- Cancellation returns items to stock; un-cancelling re-takes them.
  -- A restore that crosses 0 fires the back-in-stock alerts chain.
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.products p
       set stock = p.stock + s.q
      from (select product_id, sum(qty) as q from public.order_items
             where order_id = new.id group by 1) s
     where p.slug = s.product_id;
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    update public.products p
       set stock = greatest(0, p.stock - s.q)
      from (select product_id, sum(qty) as q from public.order_items
             where order_id = new.id group by 1) s
     where p.slug = s.product_id;
  end if;

  -- Guest orders have no account to notify.
  if new.user_id is null then return new; end if;

  v_title := case new.status
    when 'confirmed'  then 'تم تأكيد طلبك ✅'
    when 'processing' then 'طلبك قيد التجهيز 📦'
    when 'shipped'    then 'تم شحن طلبك 🚚'
    when 'delivered'  then 'تم تسليم طلبك 🎉'
    when 'cancelled'  then 'تم إلغاء طلبك ❌'
    else null
  end;
  if v_title is null then return new; end if;

  v_body := 'طلب #' || substr(new.id::text, 1, 8) || ' بقيمة ' ||
            to_char(new.total, 'FM999,999,990') || ' ر.ي' ||
            case when new.status = 'delivered'
                 then ' — نتمنى أن ينال إعجابك! شاركنا تقييمك للمنتجات.'
                 else '.' end;

  insert into public.notifications (user_id, title, body, link)
  values (new.user_id, v_title, v_body, '/orders');

  return new;
end;
$$;

drop trigger if exists trg_order_status_change on public.orders;
create trigger trg_order_status_change
  after update of status on public.orders
  for each row
  execute function public.on_order_status_change();

-- ---------------------------------------------------------------------
-- Stock crossing its low threshold (or hitting 0) -> warn admins.
-- ---------------------------------------------------------------------
create or replace function public.on_product_low_stock()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_threshold int := coalesce(new.low_stock_threshold, 5);
begin
  if coalesce(new.stock, 0) <= 0 and coalesce(old.stock, 0) > 0 then
    perform public.notify_admins(
      'نفد المخزون 🚨',
      new.name || ' نفد تماماً — العملاء يرون "نفدت الكمية" الآن.',
      '/admin/inventory'
    );
  elsif coalesce(new.stock, 0) > 0
        and coalesce(new.stock, 0) <= v_threshold
        and coalesce(old.stock, 0) > v_threshold then
    perform public.notify_admins(
      'مخزون منخفض ⚠️',
      new.name || ' — تبقى ' || new.stock || ' فقط. فكّر بإعادة التوريد.',
      '/admin/inventory'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_product_low_stock on public.products;
create trigger trg_product_low_stock
  after update of stock on public.products
  for each row
  execute function public.on_product_low_stock();
