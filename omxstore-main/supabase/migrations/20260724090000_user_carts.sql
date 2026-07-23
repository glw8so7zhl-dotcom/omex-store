-- =====================================================================
-- OMEX — Returning-customer experience: account carts + abandoned-cart
-- reminders.
--
-- 1) user_carts: the signed-in user's cart lives on their account —
--    follows them across devices and survives cleared browsers.
-- 2) remind_abandoned_carts(): a cart idle for 3+ hours with items gets
--    one bell notification ("سلتك بانتظارك 🛒") per cart version —
--    scheduled via pg_cron every 30 minutes, entirely inside Postgres.
-- =====================================================================

create table if not exists public.user_carts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  reminded_at timestamptz
);

alter table public.user_carts enable row level security;

drop policy if exists user_carts_select_own on public.user_carts;
create policy user_carts_select_own on public.user_carts
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_carts_insert_own on public.user_carts;
create policy user_carts_insert_own on public.user_carts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_carts_update_own on public.user_carts;
create policy user_carts_update_own on public.user_carts
  for update to authenticated
  using (user_id = auth.uid());

drop policy if exists user_carts_delete_own on public.user_carts;
create policy user_carts_delete_own on public.user_carts
  for delete to authenticated
  using (user_id = auth.uid());

-- One reminder per cart version: reminded_at < updated_at re-arms it.
create or replace function public.remind_abandoned_carts()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer := 0;
begin
  with due as (
    select c.user_id, jsonb_array_length(c.items) as n
    from public.user_carts c
    where jsonb_array_length(c.items) > 0
      and c.updated_at < now() - interval '3 hours'
      and (c.reminded_at is null or c.reminded_at < c.updated_at)
  ),
  ins as (
    insert into public.notifications (user_id, title, body, link)
    select
      user_id,
      'سلتك بانتظارك 🛒',
      'لديك ' || n || ' منتج في سلتك — أكمل طلبك قبل نفاد المخزون.',
      '/cart'
    from due
    returning user_id
  )
  update public.user_carts c
     set reminded_at = now()
    from ins
   where c.user_id = ins.user_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Schedule inside the database (no external cron/server needed).
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('omex-abandoned-carts');
exception when others then
  null; -- job didn't exist yet
end $$;

select cron.schedule(
  'omex-abandoned-carts',
  '*/30 * * * *',
  'select public.remind_abandoned_carts()'
);
