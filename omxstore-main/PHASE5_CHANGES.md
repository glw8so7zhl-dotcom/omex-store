# OMEX Store — Phase 5 Change Log (Performance & Production Readiness)

**Scope:** Images, bundle/critical-path, rendering/caching, SEO, accessibility.
**Guarantee:** No functionality removed. No new dependencies. Auth/Supabase/DB/business logic untouched. SSR-safe; reduced-motion respected.

> Lighthouse can't be measured in this environment. These are well-established optimizations that reliably move each category; **measure final scores in Lovable / PageSpeed Insights** on your deployed URL. Note the one inherent tension + mitigation under "3D vs performance" below.

---

## Images (biggest win)
- Converted all product images to **WebP**, resized to 640px, and the hero to WebP:
  - Product images: **1018 KB → 118 KB (≈89% smaller)**.
  - Hero: **169 KB → 86 KB**.
- Storefront serves `.webp` via a scoped rewrite in `src/lib/catalog.ts` (`/products/*.png → *.webp`); the DB keeps `.png` for the admin, and admin-uploaded images pass through untouched. Both `.png` (admin) and `.webp` (storefront) ship in `public/products/`.
- Added explicit `width`/`height` + `decoding="async"` to product images (removes CLS; satisfies "explicit dimensions"). Product-detail hero image gets `fetchPriority="high"` (LCP); decorative images marked `aria-hidden`.

## Critical-path JS / bundle
- **`RouteProgress` rewritten to be CSS-only** — the root shell no longer imports GSAP, so GSAP now loads **only on the home route** (hero). Product, category, cart, checkout, account, and search pages no longer download the animation engine.
- **3D is deferred to browser-idle** (`requestIdleCallback`, `HeroCanvas`) in addition to being code-split, client-only, and desktop-gated — so the Three.js chunk never competes with initial load, even on desktop.

## Rendering / caching (`src/router.tsx`)
- QueryClient defaults: `staleTime` 5 min, `gcTime` 10 min, `retry` 1, `refetchOnWindowFocus` off — fewer redundant refetches and less main-thread work.
- `defaultPreload: "intent"` (preload route code + data on hover/touch) + `defaultPreloadStaleTime: 30s` (was 0) for snappy, non-wasteful navigation.

## SEO
- `public/robots.txt` — valid; allows crawling, disallows app-gated/non-indexable areas (`/admin`, `/account`, `/orders`, `/checkout`, `/search`).
- **Product JSON-LD** (`schema.org/Product` with brand, price in `YER`, availability, and aggregate rating) rendered server-side on product detail — a strong ecommerce SEO signal.
- Early **preconnect to the Supabase API origin** for faster client-side data fetches.
- (Already in place from earlier phases: per-route titles/descriptions, OG/Twitter tags, `lang="ar" dir="rtl"`, `noindex` on search/favorites, semantic headings, real crawlable links.)

## Accessibility (carried + reinforced)
- Explicit image dimensions, `aria-hidden` on decorative imagery, labelled search + sort controls, global `:focus-visible` outline, AA-tuned muted text, `prefers-reduced-motion` honored across CSS/Framer/idle-3D.

## 3D vs performance (the one tension, mitigated)
Three.js is heavy and fights a high Lighthouse score. Mitigations: code-split into its own chunk, **client-only**, **desktop + multi-core + WebGL gated** (mobile Lighthouse never loads it), and **idle-deferred** so it loads after the page is interactive. If a desktop Lighthouse run still dips, the 3D can be gated more aggressively (e.g., pointer:fine + wider viewport) or disabled — say the word.

## Deferred (recommended next, out of the 5-phase scope)
- `sitemap.xml` + `<link rel="canonical">` — both need your **production domain**; give it to me and I'll add them.
- DB-driven coupons/shipping; `order_items → products` FK; tighten the open order-insert RLS; per-user wishlist DB sync; admin pagination; Addresses/Notifications/Settings account sections.

## How to verify
1. Push to Lovable (no new deps). Product images should load as small WebP.
2. Run Lighthouse/PageSpeed on the deployed **home** and a **product** page (mobile + desktop).
3. Confirm the storefront, checkout, auth, and admin still work.
4. See `FINAL_SUMMARY.md` for the whole-project recap and prioritized next steps.
