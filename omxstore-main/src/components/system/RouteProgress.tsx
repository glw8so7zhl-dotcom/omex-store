import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * OMEX — top route-loading bar (CSS-only).
 *
 * Phase 5: rewritten without GSAP so the root shell no longer pulls the
 * animation engine into the critical bundle — GSAP now loads only on the home
 * route (hero). A width transition ramps to ~85% while route matches load,
 * then completes and fades. Reduced-motion is honored by the global CSS block
 * (transitions collapse to ~instant).
 */
export function RouteProgress() {
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setWidth(8);
      const t = setTimeout(() => setWidth(85), 80);
      return () => clearTimeout(t);
    }
    if (visible) {
      setWidth(100);
      const t = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 350);
      return () => clearTimeout(t);
    }
    // Only react to load-state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-0.5 pointer-events-none" aria-hidden="true">
      <div
        className="h-full gradient-primary transition-[width,opacity] duration-300 ease-out"
        style={{ width: `${width}%`, opacity: width >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
