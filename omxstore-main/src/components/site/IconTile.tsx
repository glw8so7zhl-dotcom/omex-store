import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";
type Tone = "gradient" | "gradientSale" | "primarySoft" | "successSoft";

const SIZE: Record<Size, { box: string; icon: string; radius: string }> = {
  sm: { box: "h-9 w-9", icon: "h-4 w-4", radius: "rounded-xl" },
  md: { box: "h-10 w-10", icon: "h-5 w-5", radius: "rounded-xl" },
  lg: { box: "h-11 w-11", icon: "h-5 w-5", radius: "rounded-2xl" },
  xl: { box: "h-16 w-16", icon: "h-7 w-7", radius: "rounded-2xl" },
};

const TONE: Record<Tone, string> = {
  gradient: "gradient-primary text-white shadow-glow-sm",
  gradientSale: "gradient-sale text-white shadow-glow-sm",
  primarySoft: "bg-primary/15 text-primary-glow",
  successSoft: "bg-success/15 text-success",
};

/**
 * OMEX Design System — IconTile
 * Reusable icon container used in section headings, feature rows,
 * trust badges and empty-state hero marks.
 */
export function IconTile({
  icon: Icon,
  size = "md",
  tone = "gradient",
  className,
}: {
  icon: LucideIcon;
  size?: Size;
  tone?: Tone;
  className?: string;
}) {
  const s = SIZE[size];
  return (
    <div className={cn("grid place-items-center shrink-0", s.box, s.radius, TONE[tone], className)}>
      <Icon className={s.icon} />
    </div>
  );
}
