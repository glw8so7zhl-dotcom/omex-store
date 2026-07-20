# OMEX Store — Phase 0 + Phase 1 Change Log

**Scope:** Foundations + premium UI elevation.
**Guarantee:** No functionality removed. No dependencies added. No Supabase/auth/DB/business-logic touched. All component public APIs, props, and behaviors preserved. Changes are additive and delivered through the shared design system, so they propagate to every page.

> Verification note: this environment cannot run the Lovable/Nitro/Cloudflare build (npm registry blocked), so changes were verified by hand — API/behavior preservation, balanced JSX, defined utilities, no broken references. **Please preview in Lovable before Phase 2.**

---

## Phase 0 — Foundations

| File | Change |
|------|--------|
| `src/components/system/ClientOnly.tsx` *(new)* | SSR-safe client-only boundary (mount-gated). Unused today; the Phase 3 3D layer will render inside it so Cloudflare SSR never evaluates WebGL. |
| `package.json` | **Unchanged in Phase 1** by design. GSAP is added in Phase 2, `three`/`@react-three/fiber`/`@react-three/drei` in Phase 3 — at their point of use, to keep this preview install-safe. |

## Phase 1 — Premium UI elevation

### Design system / theme — `src/styles.css`
- **Depth system:** richer, layered `--shadow-card` / `--shadow-glow` (with a subtle inset top-highlight baked in so glass surfaces read as premium glass), plus a new `--shadow-elevated` token + `shadow-elevated` utility.
- **Color:** raised `--muted-foreground` lightness for AA contrast on dark; added `--surface-3` and `--gradient-sheen` tokens; a soft radial "depth wash" behind the app shell.
- **Typography rhythm:** `text-wrap: balance` on headings, `pretty` on paragraphs, tighter heading line-height, `optimizeLegibility`. **No letter-spacing applied to Arabic** (cursive/joined script — intentionally avoided).
- **Accessibility:** global `:focus-visible` outline (additive, follows each element's radius); thin themed scrollbars; `prefers-reduced-motion` block that neutralizes all CSS animation/transition.
- **Motion:** added `rise-in` + `sheen` keyframes, `animate-rise-in`, `text-balance`, `--ease-premium`.
- Every pre-existing token, `@utility` (`glass`, `glass-strong`, `gradient-*`, `shadow-*`, `text-gradient`, `animate-*`) and keyframe is preserved.

### Buttons — `src/components/ui/button.tsx`
- Premium transition curve + accessible `focus-visible` ring (ring-2 + offset). Subtle hover lift on `gradient` / `gradientGlow` / `glass` / `success`, resetting on active. **All variants and sizes unchanged.**

### Inputs & forms — `src/components/ui/input.tsx`, `textarea.tsx`, `src/components/site/TextField.tsx`
- Taller (h-10), softer radius, hover border, stronger focus ring.
- **Bug fix:** `TextField` used a module-level mutable id counter (`__uid`) — an SSR hydration hazard. Replaced with `React.useId()` for stable server/client ids. API unchanged.

### Product card — `src/components/site/ProductCard.tsx`
- Premium easing, deeper hover lift, hover glow shadow. All links, add-to-cart, WhatsApp, and favorite handlers unchanged.

### Navigation — `src/components/site/Header.tsx`
- Search is now an accessible `role="search"` form with a real `<label>` (sr-only), `aria-label`, and `onSubmit` guard (no page reload). It remains inert until **Phase 4** wires real search — no behavior removed.

### Loading / error states
- `src/components/ui/skeleton.tsx`: premium shimmer sweep (reduced-motion safe).
- `src/components/ui/spinner.tsx`: `PageSpinner` gains a soft branded glow.
- `src/routes/__root.tsx`: 404 and error-boundary screens now use premium glass cards with a rise-in entrance (className-only; logic untouched).

---

## Intentionally deferred (later phases, by your plan)
- Page transitions, GSAP scroll/hero motion, animated nav, hover choreography → **Phase 2**.
- Cinematic 3D hero (R3F/Three.js) inside `ClientOnly`, perf-budgeted → **Phase 3**.
- Real search, filters, wishlist, DB-backed catalog, order tracking → **Phase 4**.
- Image optimization, code-splitting, Lighthouse tuning → **Phase 5**.

## How to verify
1. Push this tree to your Lovable-connected repo (or drop the files in).
2. Open the Lovable preview. Check: home, product detail, cart, checkout, auth, admin — all should look elevated and behave exactly as before.
3. Confirm auth/login, Supabase reads, and admin CRUD still work.
4. Reply **continue** and I'll proceed to Phase 2.
