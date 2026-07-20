
-- Pin search_path
CREATE OR REPLACE FUNCTION public.is_coupon_valid(_c public.coupons)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT _c.is_active
    AND (_c.starts_at IS NULL OR _c.starts_at <= now())
    AND (_c.expires_at IS NULL OR _c.expires_at > now())
    AND (_c.max_uses IS NULL OR _c.used_count < _c.max_uses)
$$;

-- Lock down SECURITY DEFINER execute
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
