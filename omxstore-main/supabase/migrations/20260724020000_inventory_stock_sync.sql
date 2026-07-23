-- OMEX — Two-way stock sync between `inventory` and `products`.
-- Before this, the admin inventory page edited `inventory.stock` while the
-- storefront (and the product-alerts trigger) read `products.stock` — two
-- unsynced sources of truth. These triggers keep them consistent in both
-- directions; the `is distinct from` guards make them converge in one hop
-- (no loops). Chain effect: restocking from the inventory page updates the
-- storefront AND fires the back-in-stock notifications automatically.

create or replace function public.sync_stock_from_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
     set stock = new.stock
   where id = new.product_id
     and stock is distinct from new.stock;
  return new;
end;
$$;

drop trigger if exists trg_inventory_stock_sync on public.inventory;
create trigger trg_inventory_stock_sync
  after insert or update of stock on public.inventory
  for each row
  execute function public.sync_stock_from_inventory();

create or replace function public.sync_stock_to_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.inventory
     set stock = new.stock
   where product_id = new.id
     and stock is distinct from new.stock;
  return new;
end;
$$;

drop trigger if exists trg_products_stock_sync on public.products;
create trigger trg_products_stock_sync
  after update of stock on public.products
  for each row
  execute function public.sync_stock_to_inventory();
