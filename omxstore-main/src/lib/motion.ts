import type { Transition, Variants } from "motion/react";

/**
 * OMEX — shared motion tokens.
 * Central source of truth so every micro-interaction feels part of one system.
 * Framer components already honor reduced-motion via `useReducedMotion`;
 * imperative (GSAP) code paths should call `prefersReducedMotion()`.
 */

// Premium ease (matches --ease-premium in styles.css). Typed as a bezier tuple
// so it satisfies Framer's Easing type under strict TS.
export const EASE_PREMIUM: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const springSoft: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 0.7,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_PREMIUM } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: EASE_PREMIUM } },
};

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

/** SSR-safe reduced-motion check for imperative (GSAP) code. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
