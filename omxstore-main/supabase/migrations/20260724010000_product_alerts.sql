-- OMEX — Product alerts: back-in-stock + price-drop notifications
-- A user subscribes on the product page; a database trigger converts the
-- admin's stock/price updates into rows in `notifications` automatically
-- (no cron, no service role, no extra server). Alerts are one-shot: after
-- notifying, the alert row is deleted (the user can re-subscribe).

create table if not exists public.product_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  kind text not null check (kind in ('restock', 'price_drop')),
  created_at timestamptz not null default now(),
  unique (user_id, product_id, kind)
);

create index if not exists idx_product_alerts_product
  on public.product_alerts (product_id, kind);

alter table public.product_alerts enable row level security;

-- Users manage their own alerts; admins can read them all (demand insight)
-- and remove them if needed.
drop policy if exists product_alerts_select_own_or_admin on public.product_alerts;
create policy product_alerts_select_own_or_admin on public.product_alerts
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists product_alerts_insert_own on public.product_alerts;
create policy product_alerts_insert_own on public.product_alerts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists product_alerts_delete_own_or_admin on public.product_alerts;
create policy product_alerts_delete_own_or_admin on public.product_alerts
  for delete to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger: fan stock/price changes out to subscribed users' notifications.
-- SECURITY DEFINER so the insert into `notifications` bypasses its RLS
-- (which only allows admin inserts) regardless of who performed the update.
create or replace function public.process_product_alerts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Back in stock: stock went from <= 0 to > 0.
  if coalesce(old.stock, 0) <= 0 and coalesce(new.stock, 0) > 0 then
    insert into public.notifications (user_id, title, body, link)
    select a.user_id,
           'عاد للتوفر 🎉',
           new.name || ' أصبح متوفراً الآن — اطلبه قبل نفاد الكمية.',
           '/products/' || new.slug
    from public.product_alerts a
    where a.product_id = new.id and a.kind = 'restock';

    delete from public.product_alerts
    where product_id = new.id and kind = 'restock';
  end if;

  -- Price drop: new price strictly lower than the old one.
  if new.price < old.price then
    insert into public.notifications (user_id, title, body, link)
    select a.user_id,
           'انخفض السعر 📉',
           new.name || ': كان ' || to_char(old.price, 'FM999,999,990') ||
             ' وأصبح ' || to_char(new.price, 'FM999,999,990') || ' ر.ي — اغتنم الفرصة.',
           '/products/' || new.slug
    from public.product_alerts a
    where a.product_id = new.id and a.kind = 'price_drop';

    delete from public.product_alerts
    where product_id = new.id and kind = 'price_drop';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_product_alerts on public.products;
create trigger trg_product_alerts
  after update of stock, price on public.products
  for each row
  execute function public.process_product_alerts();
