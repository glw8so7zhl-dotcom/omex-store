import { Suspense, lazy, useEffect, useState } from "react";
import { ClientOnly } from "@/components/system/ClientOnly";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * OMEX — cinematic hero, mounted safely.
 *
 * The heavy Three.js scene is:
 *  1. code-split (lazy import → separate chunk, never in the main bundle),
 *  2. client-only (ClientOnly → never evaluated during SSR/Cloudflare),
 *  3. capability-gated (WebGL + desktop width + enough cores + motion allowed).
 *
 * On phones, low-power devices, no-WebGL, or reduce-motion, this renders
 * nothing and the existing static/GSAP hero remains — protecting performance
 * and the Lighthouse targets.
 */
const HeroScene = lazy(() => import("./HeroScene"));

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function useCanRender3D(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (prefersReducedMotion()) return;
    const wideEnough = window.matchMedia("(min-width: 768px)").matches;
    const cores = navigator.hardwareConcurrency ?? 8;
    if (!(wideEnough && cores > 2 && hasWebGL())) return;

    // Defer the heavy 3D chunk until the browser is idle so it never competes
    // with initial page load (protects LCP/TBT and the Lighthouse targets).
    let idleId = 0;
    let timeoutId = 0;
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => setOk(true), { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(() => setOk(true), 800);
    }
    return () => {
      if (idleId && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);
  return ok;
}

function Gate() {
  const can = useCanRender3D();
  if (!can) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      <Suspense fallback={null}>
        <HeroScene />
      </Suspense>
      {/* subtle vignette for cinematic depth + edge contrast */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(5,8,20,0.55))]" />
    </div>
  );
}

export function HeroCanvas() {
  return (
    <ClientOnly>
      <Gate />
    </ClientOnly>
  );
}
