-- =====================================================================
-- OMEX Store — Production Backend (authoritative, idempotent)
--
-- Safe to run on a fresh project OR on the existing OMEX database:
--   * tables:   CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS
--   * enums:    guarded DO blocks
--   * funcs:    CREATE OR REPLACE
--   * triggers: DROP ... IF EXISTS then CREATE
--   * policies: DROP POLICY IF EXISTS (old + canonical names) then CREATE
--   * indexes:  CREATE INDEX IF NOT EXISTS
--   * storage:  INSERT ... ON CONFLICT DO NOTHING
--
-- Entities: profiles, categories, products, product_images, orders,
--           order_items, cart_items (cart), wishlist  (+ user_roles for RBAC)
-- Storage:  products (public), avatars (public, per-user write)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Shared functions
-- ---------------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- RBAC enum + role check (SECURITY DEFINER avoids RLS recursion).
do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'moderator', 'customer');
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

-- Auto-provision profile + default role on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url)
  values (new.id,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'phone',
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict do nothing;
  return new;
end; $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- =====================================================================
-- PROFILES
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists avatar_url text;

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

drop policy if exists "Users view own profile" on public.profiles;
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Admins view all profiles" on public.profiles;
drop policy if exists "Admins update all profiles" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.update_updated_at_column();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- user_roles RLS
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
drop policy if exists "Users view own roles" on public.user_roles;
drop policy if exists "Admins manage roles" on public.user_roles;
create policy "user_roles_select_own_or_admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_manage" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- CATEGORIES
-- =====================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_ar text,
  icon text,
  gradient text,
  parent_id uuid references public.categories(id) on delete set null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role;
create index if not exists idx_categories_parent on public.categories(parent_id);
create index if not exists idx_categories_active on public.categories(is_active);
create index if not exists idx_categories_slug on public.categories(slug);
alter table public.categories enable row level security;
drop policy if exists "Public reads active categories" on public.categories;
drop policy if exists "Admins manage categories" on public.categories;
create policy "categories_public_read" on public.categories for select to anon, authenticated
  using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "categories_admin_manage" on public.categories for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop trigger if exists trg_categories_updated on public.categories;
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.update_updated_at_column();

-- =====================================================================
-- PRODUCTS
-- =====================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand text,
  category_id uuid references public.categories(id) on delete set null,
  description text,
  features jsonb not null default '[]'::jsonb,
  image text,
  price numeric(12,2) not null default 0 check (price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= 0),
  rating numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  reviews_count int not null default 0,
  sales_count int not null default 0,
  featured boolean not null default false,
  flash_sale boolean not null default false,
  is_active boolean not null default true,
  sku text,
  barcode text,
  stock int not null default 0 check (stock >= 0),
  low_stock_threshold int not null default 5,
  gallery jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  meta_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Backfill columns on pre-existing installs.
alter table public.products add column if not exists stock int not null default 0;
alter table public.products add column if not exists low_stock_threshold int not null default 5;
alter table public.products add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists tags jsonb not null default '[]'::jsonb;

grant select on public.products to anon, authenticated;
grant all on public.products to service_role;
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active on public.products(is_active);
create index if not exists idx_products_slug on public.products(slug);
create index if not exists idx_products_featured on public.products(featured) where featured;
create index if not exists idx_products_flash on public.products(flash_sale) where flash_sale;
alter table public.products enable row level security;
drop policy if exists "Public reads active products" on public.products;
drop policy if exists "Admins manage products" on public.products;
create policy "products_public_read" on public.products for select to anon, authenticated
  using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "products_admin_manage" on public.products for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.update_updated_at_column();

-- =====================================================================
-- PRODUCT IMAGES
-- =====================================================================
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.product_images to anon, authenticated;
grant all on public.product_images to service_role;
create index if not exists idx_product_images_product on public.product_images(product_id);
alter table public.product_images enable row level security;
drop policy if exists "Public reads product images" on public.product_images;
drop policy if exists "Admins manage product images" on public.product_images;
create policy "product_images_public_read" on public.product_images for select to anon, authenticated
  using (true);
create policy "product_images_admin_manage" on public.product_images for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- ORDERS  (hardened: created only by the trusted server via service_role)
-- =====================================================================
create table if not exists public.orders (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  governorate text not null,
  city text not null,
  address text not null,
  notes text,
  payment_method text not null check (payment_method in ('cod','bank_transfer')),
  subtotal numeric(12,2) not null,
  shipping numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  whatsapp_sent boolean not null default false
);
alter table public.orders add column if not exists updated_at timestamptz not null default now();

grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created on public.orders(created_at desc);
alter table public.orders enable row level security;
-- Remove the previous wide-open INSERT policy (WITH CHECK true).
drop policy if exists "Anyone can create an order" on public.orders;
drop policy if exists "Users read own orders" on public.orders;
drop policy if exists "Admins read all orders" on public.orders;
drop policy if exists "Admins update orders" on public.orders;
-- No anon/authenticated INSERT policy: orders are inserted only by the
-- checkout server function using the service_role key (bypasses RLS). This
-- closes the price/total-tampering hole while still allowing guest checkout.
create policy "orders_select_own" on public.orders for select to authenticated
  using (user_id = auth.uid());
create policy "orders_select_admin" on public.orders for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "orders_update_admin" on public.orders for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.update_updated_at_column();

-- =====================================================================
-- ORDER ITEMS  (also server-created via service_role)
-- =====================================================================
create table if not exists public.order_items (
  id uuid not null default gen_random_uuid() primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  unit_price numeric(12,2) not null,
  qty integer not null check (qty > 0),
  line_total numeric(12,2) not null
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);
alter table public.order_items enable row level security;
drop policy if exists "Anyone can create order items" on public.order_items;
drop policy if exists "Users read own order items" on public.order_items;
drop policy if exists "Admins read all order items" on public.order_items;
create policy "order_items_select_own" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = order_items.order_id and o.user_id = auth.uid()));
create policy "order_items_select_admin" on public.order_items for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- CART  (public.cart_items) — DB-backed, per user
-- =====================================================================
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  qty int not null default 1 check (qty > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);
grant select, insert, update, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
create index if not exists idx_cart_user on public.cart_items(user_id);
alter table public.cart_items enable row level security;
drop policy if exists "Users manage own cart" on public.cart_items;
create policy "cart_items_manage_own" on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop trigger if exists trg_cart_updated on public.cart_items;
create trigger trg_cart_updated before update on public.cart_items
  for each row execute function public.update_updated_at_column();

-- =====================================================================
-- WISHLIST — DB-backed, per user
-- =====================================================================
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
grant select, insert, update, delete on public.wishlist to authenticated;
grant all on public.wishlist to service_role;
create index if not exists idx_wishlist_user on public.wishlist(user_id);
alter table public.wishlist enable row level security;
drop policy if exists "Users manage own wishlist" on public.wishlist;
create policy "wishlist_manage_own" on public.wishlist for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- STORAGE BUCKETS: products (public) + avatars (public, per-user write)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('products', 'products', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- products: public read; admins write.
drop policy if exists "products_bucket_public_read" on storage.objects;
drop policy if exists "products_bucket_admin_insert" on storage.objects;
drop policy if exists "products_bucket_admin_update" on storage.objects;
drop policy if exists "products_bucket_admin_delete" on storage.objects;
create policy "products_bucket_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'products');
create policy "products_bucket_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'products' and public.has_role(auth.uid(), 'admin'));
create policy "products_bucket_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'products' and public.has_role(auth.uid(), 'admin'));
create policy "products_bucket_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'products' and public.has_role(auth.uid(), 'admin'));

-- avatars: public read; each user manages only their own folder (<uid>/...).
drop policy if exists "avatars_bucket_public_read" on storage.objects;
drop policy if exists "avatars_bucket_user_insert" on storage.objects;
drop policy if exists "avatars_bucket_user_update" on storage.objects;
drop policy if exists "avatars_bucket_user_delete" on storage.objects;
create policy "avatars_bucket_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');
create policy "avatars_bucket_user_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_bucket_user_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_bucket_user_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
