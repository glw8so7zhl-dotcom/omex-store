-- =====================================================================
-- OMEX — Self-service order cancellation.
--
-- Customers cancel their own orders while still cancellable (pending /
-- confirmed — i.e. before processing/shipping). Two verified paths:
--   * signed-in: auth.uid() must own the order
--   * guest:     last-4 digits of the order's phone must match
--
-- Setting status='cancelled' lets the EXISTING trigger fabric do the
-- heavy lifting automatically: stock returns to inventory (firing
-- back-in-stock alerts when it crosses 0), redeemed loyalty points are
-- refunded, and the customer gets their cancellation notification. This
-- RPC additionally alerts every admin.
-- =====================================================================

create or replace function public.cancel_order_v1(
  _order_id uuid,
  _phone_last4 text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_uid uuid := auth.uid();
  v_allowed boolean := false;
begin
  select * into v_order from public.orders where id = _order_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Ownership: signed-in owner, or guest with matching phone last-4.
  if v_uid is not null and v_order.user_id = v_uid then
    v_allowed := true;
  elsif _phone_last4 is not null
        and _phone_last4 ~ '^[0-9]{4}$'
        and right(regexp_replace(coalesce(v_order.phone, ''), '\D', '', 'g'), 4) = _phone_last4 then
    v_allowed := true;
  end if;

  if not v_allowed then
    return jsonb_build_object('ok', false, 'reason', 'not_allowed');
  end if;

  if v_order.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'reason', 'already_cancelled');
  end if;
  if v_order.status not in ('pending', 'confirmed') then
    return jsonb_build_object('ok', false, 'reason', 'not_cancellable');
  end if;

  -- The status-change triggers restore stock, refund redeemed points,
  -- and notify the (signed-in) customer.
  update public.orders set status = 'cancelled' where id = _order_id;

  perform public.notify_admins(
    'عميل ألغى طلبه ❌',
    coalesce(v_order.customer_name, 'عميل') || ' ألغى الطلب #' || substr(_order_id::text, 1, 8) ||
      ' (' || to_char(v_order.total, 'FM999,999,990') || ' ر.ي) — أعيدت الكمية للمخزون تلقائياً.',
    '/admin/orders'
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.cancel_order_v1(uuid, text) from public;
grant execute on function public.cancel_order_v1(uuid, text)
  to anon, authenticated, service_role;
