-- =====================================================================
-- OMEX — Product Q&A ("أسئلة وأجوبة").
--
-- Signed-in shoppers ask about a product (kills purchase hesitation and
-- drives signups); the admin answers + publishes from the dashboard; the
-- asker gets a bell notification the moment their answer lands; published
-- Q&As render publicly on the product page (trust + Arabic SEO content).
-- =====================================================================

create table if not exists public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  question text not null check (length(trim(question)) between 5 and 500),
  answer text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create index if not exists idx_pq_product on public.product_questions (product_id, is_published);
create index if not exists idx_pq_pending on public.product_questions (created_at desc) where answer is null;

alter table public.product_questions enable row level security;

-- Everyone reads PUBLISHED Q&As; users also see their own pending ones;
-- admins see everything.
drop policy if exists pq_select_published on public.product_questions;
create policy pq_select_published on public.product_questions
  for select to anon, authenticated
  using (is_published);

drop policy if exists pq_select_own_or_admin on public.product_questions;
create policy pq_select_own_or_admin on public.product_questions
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role));

-- Asking requires an account (anti-spam + growth loop).
drop policy if exists pq_insert_own on public.product_questions;
create policy pq_insert_own on public.product_questions
  for insert to authenticated
  with check (user_id = auth.uid() and answer is null and is_published = false);

-- Only admins answer/publish; owners or admins can delete.
drop policy if exists pq_update_admin on public.product_questions;
create policy pq_update_admin on public.product_questions
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists pq_delete_own_or_admin on public.product_questions;
create policy pq_delete_own_or_admin on public.product_questions
  for delete to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role));

-- The asker is notified the moment an answer first lands.
create or replace function public.on_question_answered()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_slug text;
  v_name text;
begin
  if new.answer is not null and (old.answer is null or old.answer = '') and coalesce(new.answer, '') <> '' then
    if new.answered_at is null then
      new.answered_at := now();
    end if;
    if new.user_id is not null then
      select slug, name into v_slug, v_name from public.products where id = new.product_id;
      insert into public.notifications (user_id, title, body, link)
      values (
        new.user_id,
        'أُجيب على سؤالك 💬',
        coalesce(v_name, 'المنتج') || ': ' || left(new.answer, 120),
        '/products/' || coalesce(v_slug, '')
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_question_answered on public.product_questions;
create trigger trg_question_answered
  before update on public.product_questions
  for each row
  execute function public.on_question_answered();
