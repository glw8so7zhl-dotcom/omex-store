-- =====================================================================
-- OMEX Store — Seed product_images (idempotent)
-- Categories, products, inventory and featured flags are seeded by the
-- earlier 20260720000000_seed_catalog.sql (runs first). This adds a primary
-- gallery image row per product. Re-runnable: guarded by NOT EXISTS.
-- =====================================================================
insert into public.product_images (product_id, url, alt, sort_order)
select p.id, v.url, p.name, 0
from public.products p
join (values
  ('phone-x-pro',    '/products/product-phone.webp'),
  ('headphones-air', '/products/product-headphones.webp'),
  ('watch-galaxy',   '/products/product-watch.webp'),
  ('laptop-pro',     '/products/product-laptop.webp'),
  ('sneakers-flux',  '/products/product-sneakers.webp'),
  ('drill-power',    '/products/product-drill.webp'),
  ('speaker-boom',   '/products/product-speaker.webp')
) as v(slug, url) on v.slug = p.slug
where not exists (
  select 1 from public.product_images pi where pi.product_id = p.id
);
