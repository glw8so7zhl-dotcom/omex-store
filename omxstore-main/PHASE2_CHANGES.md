# OMEX Store — Phase 2 Change Log

**Scope:** Premium animation layer — GSAP + Framer Motion, page transitions, animated navigation, hover/micro-interactions, premium loading animation.
**Guarantee:** No functionality removed. No Supabase/auth/DB/business-logic touched. Every animation is SSR-safe and honors `prefers-reduced-motion`. All component public APIs preserved.

> Verified by hand (balanced JSX, no dangling refs, resolvable imports). One new dependency added. **Please preview in Lovable before Phase 3.**

---

## Dependency
| Package | Version | Why |
|---------|---------|-----|
| `gsap` | ^3.13.0 | Timeline/tween engine for the hero reveal and route bar. |
| `@gsap/react` | ^2.1.2 | `useGSAP` hook — SSR-safe (`useLayoutEffect` timing) with automatic cleanup. |

Framer Motion was already present as `motion` (v12) — reused, not re-added.

## New files
| File | Purpose |
|------|---------|
| `src/lib/motion.ts` | Shared motion tokens: `EASE_PREMIUM`, `springSoft`, `fadeUp`, `scaleIn`, `staggerParent`, and an SSR-safe `prefersReducedMotion()` for imperative GSAP paths. |
| `src/components/system/PageTransition.tsx` | Smooth page transitions — subtle rise+fade re-keyed on pathname. Disabled on first paint (SSR/hydration) so content is **never** rendered hidden (protects LCP/SEO/no-JS). Reduced-motion aware. |
| `src/components/system/RouteProgress.tsx` | GSAP-driven top loading bar wired to the router's `isLoading`; eases to ~80% then completes and fades. Grows from the right (RTL). Reduced-motion → instant. |

## Edited files
| File | Change |
|------|--------|
| `src/routes/__root.tsx` | Mounted `<RouteProgress />`; wrapped `<Outlet />` in `<PageTransition>`. Providers stay above the transition, so cart/auth/query state persist across navigations. |
| `src/routes/index.tsx` | Home hero now animates via a GSAP staggered timeline (`useGSAP`, scoped, `power3.out`). Replaced the single Framer wrapper; each hero element carries `hero-item`. No flash (layout-effect timing) and no hidden content for no-JS. |
| `src/components/site/BottomNav.tsx` | Animated active indicator: a shared-layout `motion.span` (`layoutId="bottomnav-active"`) that slides between tabs. Reduced-motion → instant. Icon/badge raised to `z-10`. |
| `src/components/site/Header.tsx` | Cart-count badge now pops (spring) when the count changes (`motion.span` keyed on count). Reduced-motion → no pop. |
| `src/components/site/ProductCard.tsx` | Premium hover sheen sweep across the product image (pure CSS using the `--gradient-sheen` token + `sheen` keyframe). Neutralized under reduced-motion. |

## Reduced-motion & SSR safety
- Framer components use `useReducedMotion()`; GSAP paths call `prefersReducedMotion()`.
- The Phase 1 global `prefers-reduced-motion` CSS block already neutralizes CSS animations (hero orbs, sheen, shimmer).
- GSAP runs only in `useGSAP` (client), and the page-transition entrance is skipped on first paint — so server-rendered HTML is always visible and complete.

## Deferred to later phases
- Cinematic 3D hero (R3F/Three.js) inside `ClientOnly` → **Phase 3**.
- Real search, filters, wishlist, DB catalog, order tracking → **Phase 4**.
- Image optimization, code-splitting, Lighthouse tuning → **Phase 5**.

## How to verify
1. Push this tree to Lovable and open the preview.
2. Navigate between pages — note the smooth fade/rise transition and the top loading bar.
3. On mobile width, tap between bottom-nav tabs — the gradient pill slides.
4. Add items to cart — the header badge pops.
5. Hover product cards — subtle sheen + lift.
6. Toggle OS "reduce motion" — animations collapse gracefully.
7. Confirm auth, Supabase reads, and admin CRUD still work.
8. Reply **continue** for Phase 3 (cinematic 3D).
