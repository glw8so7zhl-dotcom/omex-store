-- Seed the legacy OMEX10 coupon into the coupons table so checkout's
-- DB-driven coupon validation preserves existing behavior. Idempotent.
insert into public.coupons (code, description, discount_type, discount_value, min_subtotal, is_active)
values ('OMEX10', 'خصم ترحيبي 10%', 'percent', 10, 0, true)
on conflict (code) do nothing;
