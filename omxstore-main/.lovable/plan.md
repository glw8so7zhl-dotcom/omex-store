# OMEX Store — Checkout Flow + Project Audit

Two deliverables in one pass: a real checkout backed by Lovable Cloud, and a focused audit pass that removes dead weight and standardizes patterns **without touching the visual design**.

---

## Part 1 — Checkout Flow

### Backend (Lovable Cloud / Supabase)
Enable Lovable Cloud, then migrate:

- `orders` table
  - `id uuid pk`, `created_at timestamptz`
  - `user_id uuid null` (nullable — guest checkout allowed)
  - `customer_name text`, `phone text`, `governorate text`, `city text`, `address text`, `notes text null`
  - `payment_method text check in ('cod','bank_transfer')`
  - `subtotal numeric`, `shipping numeric`, `discount numeric`, `total numeric`
  - `status text default 'pending'` (pending / confirmed / shipped / delivered / cancelled)
  - `whatsapp_sent bool default false`
- `order_items` table
  - `id uuid pk`, `order_id uuid fk cascade`
  - `product_id text`, `product_name text`, `unit_price numeric`, `qty int`, `line_total numeric`
- GRANTs: `INSERT` to `anon` + `authenticated` on both tables (guest checkout); `SELECT` only to `authenticated` where `user_id = auth.uid()`; full `ALL` to `service_role`.
- RLS enabled with matching policies.

### Server function
`src/lib/orders.functions.ts` — `createOrder` server fn:
- Zod-validated payload (shipping fields + items + payment method).
- Recomputes totals server-side from a trusted product map (never trust client prices).
- Inserts order + items via publishable-key server client (anon insert policy).
- Returns `{ orderId, total }`.

### Routes
- `src/routes/checkout.tsx` — 3-step form (Shipping → Payment → Review) using existing glass styling. Governorate select (Yemen governorates), phone validation, COD vs Bank Transfer radios (bank transfer shows account details + note that confirmation is manual via WhatsApp).
- `src/routes/checkout.success.$id.tsx` — success page with order id, summary, and "أرسل تأكيد الطلب عبر واتساب" button (prefilled message: order id, items, total, shipping address, payment method). Clears cart on mount.

### Cart wiring
- Replace `cart.tsx`'s inline "إتمام الشراء" button behavior: navigate to `/checkout` when items > 0.
- Keep the existing "اطلب عبر واتساب" quick path untouched.

---

## Part 2 — Project Audit (non-visual)

### Structural
- Move `src/lib/cart.tsx` → `src/features/cart/CartProvider.tsx` + `useCart` hook, and `src/lib/products.ts` → `src/features/catalog/products.ts`. Update imports. (Prepares for feature-based scaling.)
- Add `src/features/checkout/` for new order code (schema, server fn, form components).
- Add `src/lib/format.ts` housing `formatPrice` (currently in products.ts) so formatting isn't coupled to seed data.

### Code quality
- Consolidate the two WhatsApp helpers: keep `whatsappUrl` + `whatsappProductUrl` + new `whatsappOrderUrl(order)` in one module.
- Extract shared `Row` summary component (used in cart + checkout review) into `src/components/site/SummaryRow.tsx`.
- Extract `QtyStepper` (+/− control duplicated in cart + product detail) into `src/components/site/QtyStepper.tsx`.
- Type `WHATSAPP_NUMBER` as env-overridable: read `import.meta.env.VITE_WHATSAPP_NUMBER` with fallback.
- Add `Product` id typing consistency: server fn accepts `string`, order stores `product_id text` (no FK to seed data yet).

### Cleanup
- Remove unused imports flagged by eslint after refactor.
- Confirm no orphan files under `src/routes` or `src/components`; delete any (none currently expected).
- Ensure every route file has `head()` metadata (audit `account.tsx`, `favorites.tsx`, `categories.tsx`, add if missing).

### Accessibility & responsiveness
- Add `aria-label` to icon-only buttons where missing (audit pass on Header, BottomNav, ProductCard).
- Ensure all form inputs in checkout have associated `<label>` (visible or `sr-only`).
- Verify tap targets ≥ 44px on mobile in checkout form.

### Performance
- Add `loading="lazy"` + `decoding="async"` to product `<img>` in ProductCard and cart rows.
- No functional bundle-splitting changes (Vite handles it) — just verify no accidental server-only imports in client components.

### Not in scope this turn
- Real auth / user accounts, admin dashboard, real payment integrations, product CRUD, real categories page content, favorites persistence, i18n, PWA/push, image CDN. Called out so we can prioritize follow-ups.

---

## Technical notes

- Lovable Cloud will be enabled at the start of implementation; migration and grants land in a single SQL file.
- Server fn uses publishable-key client (not admin) because insert is permitted by RLS policy for `anon`.
- WhatsApp confirmation stays client-side (opens `wa.me` link) — no server-side WA API.
- No visual redesign: reuses existing tokens (`glass`, `gradient-primary`, `text-gradient`, shadows) and typography.

Approve to proceed, or tell me what to trim (e.g. skip the folder restructure, or skip Supabase and keep checkout local-only).