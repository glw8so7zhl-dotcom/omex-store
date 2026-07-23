-- =====================================================================
-- Fix: anon-facing read policies must not call has_role() (anon has no
-- EXECUTE on it — by design). Split each "public read" policy into a
-- simple anon-safe policy + a separate admin-read policy (authenticated
-- only). Policies OR-combine, so behavior for admins is unchanged.
-- =====================================================================

-- PRODUCTS
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select to anon, authenticated using (is_active);
drop policy if exists "products_admin_read" on public.products;
create policy "products_admin_read" on public.products
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CATEGORIES
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select to anon, authenticated using (is_active);
drop policy if exists "categories_admin_read" on public.categories;
create policy "categories_admin_read" on public.categories
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- BANNERS
drop policy if exists "banners_public_read" on public.banners;
create policy "banners_public_read" on public.banners
  for select to anon, authenticated using (is_active);
drop policy if exists "banners_admin_read" on public.banners;
create policy "banners_admin_read" on public.banners
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- SETTINGS
drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read" on public.settings
  for select to anon, authenticated using (is_public);
drop policy if exists "settings_admin_read" on public.settings;
create policy "settings_admin_read" on public.settings
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- SHIPPING METHODS
drop policy if exists "shipping_methods_public_read" on public.shipping_methods;
create policy "shipping_methods_public_read" on public.shipping_methods
  for select to anon, authenticated using (is_active);
drop policy if exists "shipping_methods_admin_read" on public.shipping_methods;
create policy "shipping_methods_admin_read" on public.shipping_methods
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- REVIEWS (anon path: approved only; owner/admin paths authenticated-only)
drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_public_read" on public.reviews
  for select to anon, authenticated using (is_approved);
drop policy if exists "reviews_owner_read" on public.reviews;
create policy "reviews_owner_read" on public.reviews
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "reviews_admin_read" on public.reviews;
create policy "reviews_admin_read" on public.reviews
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
