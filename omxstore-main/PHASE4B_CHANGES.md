# OMEX Store — Phase 4B Change Log (Search · Filters · Wishlist · Account & Order Tracking)

**Scope:** Complete the ecommerce UX on top of the 4A Supabase catalog.
**Guarantee:** No functionality removed. No new dependencies. Auth/Supabase/DB/business logic untouched. SSR-safe; reduced-motion respected.

> Two **new routes** were added (`/search`, `/orders`). The TanStack Router plugin regenerates `routeTree.gen.ts` on build/dev, so they register automatically on push — no manual edit needed. **Please preview in Lovable.**

---

## New files
| File | Purpose |
|------|---------|
| `src/lib/wishlist.tsx` | `WishlistProvider` + `useWishlist()` — favorites persisted to localStorage by product slug (works for guests and logged-in users, mirroring the cart). |
| `src/routes/search.tsx` | `/search?q=` results page. SSR loader loads the catalog; filters by name/brand/description; empty + no-results states. `noindex`. |
| `src/routes/_authenticated/orders.tsx` | `/orders` — order history + a visual **tracking stepper** (pending → confirmed → shipped → delivered, or cancelled). Reads the user's own orders (RLS now matches because 4A sets `user_id`). Loading/empty/error states. |

## Edited files
| File | Change |
|------|--------|
| `src/routes/__root.tsx` | Wrapped the app in `WishlistProvider`. |
| `src/components/site/Header.tsx` | Search is now **functional** — controlled input submits to `/search?q=`. The favorites heart is a real link to `/favorites` with a live wishlist-count badge. |
| `src/components/site/ProductCard.tsx` | Heart button toggles the wishlist (fills + toasts add/remove) instead of a fake toast. |
| `src/routes/products.$id.tsx` | Product detail favorite button wired to the wishlist (fill + label state). |
| `src/routes/favorites.tsx` | Rebuilt from the "coming soon" stub into a real favorites grid (with empty state + clear-all), backed by the wishlist. |
| `src/routes/categories.tsx` | Added **category filtering** (tap a category to filter/clear) and **sorting** (featured / price ↑ / price ↓ / rating), with a filtered empty state. |
| `src/components/site/CategoryChip.tsx` | Optional `onClick` + `active` props (backward-compatible) so chips double as filters; active ring. |
| `src/routes/_authenticated/account.tsx` | "طلباتي" now links to `/orders`. Addresses/Notifications/Settings are honestly marked "قريباً" instead of looking like dead links. |

## Behavior notes
- **Search** currently filters the loaded catalog client-side (name/brand/description) — instant for this catalog and safe from query-injection; can move to a server `ilike`/full-text query at scale.
- **Wishlist** is localStorage-based (universal, no auth friction). Optional future enhancement: sync to the per-user `wishlist` table for signed-in users (needs product UUIDs + auth-scoped writes).
- **Order tracking** shows the status pipeline from the `orders.status` field; admins advance status in the existing Admin → Orders screen.

## Not changed (still deferred)
- DB-driven coupons/shipping; `order_items → products` FK; tightening the open order-insert RLS (recommended, offered separately).
- Addresses/Notifications/Settings account sections (marked "soon").

## How to verify
1. Push to Lovable (no new deps; router plugin registers `/search` and `/orders`).
2. **Search:** type in the header search + Enter → `/search` shows matching products.
3. **Filters:** on `/categories`, tap a category to filter; change the sort dropdown.
4. **Wishlist:** click hearts on cards/detail → they fill; the header heart badge counts; `/favorites` lists them; clear works. Works logged-out too.
5. **Account/Orders:** log in → Account → "طلباتي" → `/orders` shows your orders with a tracking stepper. Place an order and confirm it appears.
6. Confirm auth, admin CRUD, and checkout still work.
7. Reply **continue** for **Phase 5** (performance, images, bundle, Lighthouse ≥95).
