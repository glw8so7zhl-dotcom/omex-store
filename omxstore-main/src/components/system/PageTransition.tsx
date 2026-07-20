import { useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { EASE_PREMIUM } from "@/lib/motion";

/**
 * OMEX — smooth page transitions.
 *
 * Re-keys on pathname so each navigation plays a subtle rise+fade entrance.
 * Crucially, the entrance is disabled on the first paint (SSR/hydration) so
 * content is never rendered hidden — that protects LCP/SEO and no-JS users.
 * Honors prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const animate = mounted && !reduce;

  return (
    <motion.div
      key={pathname}
      initial={animate ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: EASE_PREMIUM }}
    >
      {children}
    </motion.div>
  );
}
