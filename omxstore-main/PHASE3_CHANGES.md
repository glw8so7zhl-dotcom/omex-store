# OMEX Store — Phase 3 Change Log

**Scope:** Cinematic 3D hero — React Three Fiber + Three.js, realistic (image-based) lighting, floating product, subtle camera drift, premium particles, atmospheric depth.
**Guarantee:** No functionality removed. No Supabase/auth/DB/business-logic touched. The static/GSAP hero is fully preserved and remains the fallback. Performance protected by design (see below).

> **Performance-first:** the entire Three.js layer is code-split, client-only, and capability-gated. Mobile, low-power, no-WebGL, and reduce-motion users never download or run it — they keep the fast Phase 1/2 hero. This keeps the Phase 5 Lighthouse targets reachable.
>
> Verified by hand (code-split boundary, SSR isolation, balanced JSX). **Please preview in Lovable before Phase 4.**

---

## Dependencies
| Package | Version | Notes |
|---------|---------|-------|
| `three` | ^0.171.0 | 3D engine. |
| `@react-three/fiber` | ^9.1.0 | React 19-compatible renderer for Three.js. |
| `@react-three/drei` | ^10.0.1 | Helpers: `Float`, `Environment`, `Lightformer`, `RoundedBox`, `Sparkles`. |
| `@types/three` (dev) | ^0.171.0 | Types. |

If Lovable's installer flags a peer-version conflict, tell me and I'll pin exact versions — this trio (R3F 9 / drei 10 / three 0.171 on React 19) is a known-good combination.

## New files
| File | Purpose |
|------|---------|
| `src/components/three/HeroScene.tsx` | The actual R3F `<Canvas>` scene. **Only** module importing three/@react-three — so it becomes its own lazy chunk. Floating stylized device + accent gem (`<Float>`), image-based lighting via in-scene `<Lightformer>`s (no HDR download), `<Sparkles>` particles, scene `fog` for depth, capped DPR `[1, 1.75]`, no shadow maps. |
| `src/components/three/HeroCanvas.tsx` | Safe mount wrapper: `lazy()` (code-split) + `<Suspense>` + `ClientOnly` (no SSR) + capability gate (WebGL present, viewport ≥768px, `hardwareConcurrency` > 2, motion allowed). Renders nothing when unsupported. |

## Edited files
| File | Change |
|------|--------|
| `src/routes/index.tsx` | Imported and mounted `<HeroCanvas />` as a `pointer-events-none` layer inside the hero (so it never blocks the CTAs); raised hero content to `z-10` so text stays crisp above the scene. Static background image + orbs + GSAP text reveal all remain. |
| `package.json` | Added the four dependencies above. No Vite plugin changes (Lovable's config untouched). |

## Why this can't hurt performance
- **Code-split:** `lazy(() => import("./HeroScene"))` puts three/drei/fiber in a separate async chunk — absent from the initial/main bundle.
- **Client-only:** rendered inside `ClientOnly`, so SSR (Cloudflare Workers) never evaluates WebGL.
- **Gated:** the chunk is only fetched when the device actually qualifies (desktop-width, multi-core, WebGL, motion allowed). Mobile Lighthouse runs never load it.
- **Budgeted:** DPR capped, ~200 particles, low-poly meshes, no shadow maps, lighting baked in-scene (no network HDR).
- **Graceful fallback:** everything degrades to the existing static hero.

## Deferred to later phases
- DB-backed catalog, search, filters, wishlist, order tracking → **Phase 4**.
- Image optimization, bundle/render tuning, Lighthouse validation (incl. confirming the 3D chunk stays out of the critical path) → **Phase 5**.

## How to verify
1. Push to Lovable (installs the 3D deps automatically) and open the preview on a **desktop** browser.
2. Home hero should show a floating device + gem, drifting camera, particles, and reflective lighting — behind crisp, readable text.
3. Resize to mobile width or enable "reduce motion" → the 3D disappears and the static hero shows (no jank).
4. Confirm auth / Supabase / admin CRUD still work.
5. Reply **continue** for Phase 4 (ecommerce UX + Supabase catalog migration).
