import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";
const MAX: Record<Size, string> = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
};

/**
 * OMEX Design System — page-level Container.
 * Standardizes horizontal padding and max-width across every route.
 */
export function Container({
  children,
  size = "xl",
  className,
  as: As = "div",
}: {
  children: ReactNode;
  size?: Size;
  className?: string;
  as?: "div" | "section" | "main" | "header" | "footer";
}) {
  return <As className={cn("mx-auto px-4", MAX[size], className)}>{children}</As>;
}
