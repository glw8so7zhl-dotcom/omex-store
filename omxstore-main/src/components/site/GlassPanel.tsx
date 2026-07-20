import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "glass" | "strong";
type Radius = "2xl" | "3xl";
type Pad = "none" | "sm" | "md" | "lg";

const RADIUS: Record<Radius, string> = { "2xl": "rounded-2xl", "3xl": "rounded-3xl" };
const PAD: Record<Pad, string> = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

/**
 * OMEX Design System — GlassPanel
 * The single reusable primitive for glassmorphism containers.
 * Replaces ad-hoc `glass rounded-* p-* shadow-card` combinations.
 */
export function GlassPanel({
  tone = "glass",
  radius = "3xl",
  pad = "md",
  shadow = true,
  className,
  children,
  as: As = "div",
}: {
  tone?: Tone;
  radius?: Radius;
  pad?: Pad;
  shadow?: boolean;
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "aside" | "article";
}) {
  return (
    <As
      className={cn(
        tone === "strong" ? "glass-strong" : "glass",
        RADIUS[radius],
        PAD[pad],
        shadow && "shadow-card",
        className,
      )}
    >
      {children}
    </As>
  );
}
