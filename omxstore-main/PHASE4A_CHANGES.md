# OMEX Store — Phase 4A Change Log (Catalog → Supabase)

**Scope:** Make the Supabase database the single source of truth for the storefront, and attribute orders to signed-in users — without changing how the site looks or breaking checkout/auth/admin.
**Phase 4 is split into 4A (this) + 4B (next).** 4B = search, filters, wishlist, account/order-tracking.

> ⚠️ **ACTION REQUIRED — run the seed migration.** The storefront is now **data-driven**. Until the new migration `supabase/migrations/20260720000000_seed_catalog.sql` is applied to your database, catalog pages will render **empty**. Lovable applies migrations in `supabase/migrations/` on push; if yours doesn't auto-apply, open Supabase → SQL Editor and run that file. **Please review the SQL first** (as agreed).

---

## What changed

### New — database seed
`supabase/migrations/20260720000000_seed_catalog.sql` — idempotent (`ON CONFLICT DO NOTHING`). Seeds the 12 categories, 7 products, and matching inventory using the **exact** data from the old static list. **Slugs equal the previous product IDs** (`phone-x-pro`, …), so existing product URLs and any saved carts keep working. Product images were copied to `public/products/*.png` and referenced by the seed.

### New — data-access layer
`src/lib/catalog.ts` — `fetchProducts()`, `fetchProductBySlug()`, `fetchCategories()`. Maps DB rows onto the **existing** `Product`/`Category` types (so cart/checkout/cards are unchanged). Uses scalar selects + an id→slug map (fully type-safe; no fragile embedded-select strings). `Product.id = slug`.

### Storefront now reads from Supabase (SSR loaders → good SEO, no loading flash)
| File | Change |
|------|--------|
| `src/routes/index.tsx` | Added an async `loader` fetching products+categories; home derives flash/featured from real data. |
| `src/routes/categories.tsx` | Added a loader; renders real categories + products, with an empty-state if the catalog is empty. |
| `src/routes/products.$id.tsx` | Loader now fetches the product by slug from the DB (+ related by category). SSR meta tags preserved for SEO. |

Route loaders run on the server (SSR) and on client navigation (where the Phase 2 top progress bar shows). No spinner flash on first paint; content is in the SSR HTML.

### Checkout now prices from the DB + links orders to users
`src/features/checkout/orders.functions.ts`:
- Builds the trusted price map from the **`products` table** (by slug) instead of the static list — real catalog, still "never trust client prices".
- **Sets `orders.user_id`** when a valid bearer token is present (optional auth via `getOptionalUserId`; guests still allowed). This fixes the long-standing gap where logged-in users could never see their orders — it unblocks order history in 4B.
- Rejects inactive/unknown products.

### Safety — nothing removed
`src/lib/products.ts` is **untouched** (types, static arrays, `formatPrice`, helpers all remain), so admin pages and `whatsapp.ts` that import from it are unaffected. RLS, auth, and business logic are unchanged.

## Not changed in 4A (intentional)
- `order_items.product_id` stays `text` (= slug). Adding a real FK to `products` is a larger schema change I can propose separately.
- Coupons/shipping remain the hardcoded `OMEX10` / flat 3000 (DB-driven coupons come later).
- The open `orders` INSERT RLS policy (`WITH CHECK (true)`) is unchanged — I recommend tightening it, but not mid-migration without your explicit review (it could affect guest checkout if done carelessly).

## How to verify
1. Review `supabase/migrations/20260720000000_seed_catalog.sql`.
2. Push to Lovable so it installs nothing new (no deps this phase) and **applies the migration**. If the catalog looks empty, run the migration SQL manually in Supabase.
3. Storefront should look identical to before, now powered by the DB. Open a product, add to cart, and complete checkout.
4. **While logged in**, place an order — it now records your `user_id` (verify in Admin → Orders / the DB). This powers order history in 4B.
5. Confirm admin CRUD and auth still work.
6. Reply **continue** for Phase 4B (search, filters, wishlist, account & order tracking).
