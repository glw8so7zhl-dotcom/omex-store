import { useEffect, useState, type ReactNode } from "react";

/**
 * OMEX — SSR-safe client-only boundary.
 *
 * Renders `children` only after hydration on the client. Use for
 * browser-only widgets (WebGL / Three.js canvases, window / matchMedia
 * access) so server rendering on the Cloudflare Workers target never
 * evaluates them. Optionally render a `fallback` on the server / first paint.
 *
 * Introduced in Phase 0; consumed by the Phase 3 cinematic 3D layer.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <>{mounted ? children : fallback}</>;
}
