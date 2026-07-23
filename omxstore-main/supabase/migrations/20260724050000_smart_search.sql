-- =====================================================================
-- OMEX — Arabic smart search: normalization + typo tolerance.
--
-- The storefront searched with raw `ilike` on name/brand only, so common
-- Arabic spelling variants produced ZERO results (a lost sale each time):
--   "سماعه"  never matched  "سماعة/سماعات"
--   "أيفون"  never matched  "ايفون"
--   a single typo ("هاتق") matched nothing.
--
-- This migration adds:
--   normalize_arabic(text) — unifies hamza/alef forms (أإآٱ→ا), ة→ه,
--     ى→ي, ؤ→و, ئ→ي, deletes ء/tatweel/diacritics, lowercases latin,
--     collapses whitespace. IMMUTABLE so it can back expression indexes.
--   search_products_v1(q, limit) — ranked search over name/brand/
--     description/tags: normalized substring hits score highest, then
--     pg_trgm word_similarity rescues typos; ties break by sales_count.
--   GIN trigram expression indexes for scale.
-- =====================================================================

create extension if not exists pg_trgm;

create or replace function public.normalize_arabic(_t text)
returns text
language sql immutable parallel safe as $$
  select trim(regexp_replace(
    translate(
      lower(coalesce(_t, '')),
      'أإآٱةىؤئءـًٌٍَُِّْ',
      'ااااهيوي'
    ),
    '\s+', ' ', 'g'
  ))
$$;

-- Trigram expression indexes (name + brand are the hot paths).
create index if not exists idx_products_name_trgm
  on public.products using gin (public.normalize_arabic(name) gin_trgm_ops);
create index if not exists idx_products_brand_trgm
  on public.products using gin (public.normalize_arabic(brand) gin_trgm_ops);

create or replace function public.search_products_v1(_q text, _limit int default 10)
returns table (
  slug text,
  name text,
  brand text,
  image text,
  price numeric,
  old_price numeric,
  rating numeric,
  stock int,
  score real
)
language sql stable security definer set search_path = public as $$
  with q as (
    select public.normalize_arabic(_q) as nq
  )
  select
    p.slug, p.name, p.brand, p.image, p.price, p.old_price, p.rating, p.stock,
    (
        (case when public.normalize_arabic(p.name)  like '%' || q.nq || '%' then 3.0 else 0 end)
      + (case when public.normalize_arabic(p.brand) like '%' || q.nq || '%' then 2.0 else 0 end)
      + (case when public.normalize_arabic(
            coalesce(p.description, '') || ' ' || coalesce(p.tags::text, '')
          ) like '%' || q.nq || '%' then 1.0 else 0 end)
      + word_similarity(q.nq, public.normalize_arabic(p.name)) * 2.0
      + word_similarity(q.nq, public.normalize_arabic(p.brand))
    )::real as score
  from public.products p, q
  where p.is_active
    and length(q.nq) >= 2
    and (
         public.normalize_arabic(p.name)  like '%' || q.nq || '%'
      or public.normalize_arabic(p.brand) like '%' || q.nq || '%'
      or public.normalize_arabic(
           coalesce(p.description, '') || ' ' || coalesce(p.tags::text, '')
         ) like '%' || q.nq || '%'
      or word_similarity(q.nq, public.normalize_arabic(p.name)) >= 0.3
      or word_similarity(q.nq, public.normalize_arabic(p.brand)) >= 0.45
    )
  order by score desc, p.sales_count desc
  limit greatest(1, least(coalesce(_limit, 10), 50))
$$;

revoke execute on function public.search_products_v1(text, int) from public;
grant execute on function public.search_products_v1(text, int)
  to anon, authenticated, service_role;
