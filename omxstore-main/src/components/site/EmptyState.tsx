import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { GlassPanel } from "./GlassPanel";
import { IconTile } from "./IconTile";
import { cn } from "@/lib/utils";

/**
 * OMEX Design System — EmptyState
 * Standard "nothing here yet" block, used by cart, favorites, checkout, etc.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  panel = true,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  panel?: boolean;
}) {
  const body = (
    <div className={cn("text-center", className)}>
      <div className="relative mx-auto w-fit">
        <span aria-hidden="true" className="absolute inset-0 rounded-2xl bg-primary/30 blur-2xl" />
        <IconTile icon={icon} size="xl" tone="gradient" className="relative" />
      </div>
      <h2 className="mt-4 font-display text-xl font-black">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6 inline-flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );

  if (!panel) return body;
  return (
    <GlassPanel tone="glass" pad="lg" className="p-10">
      {body}
    </GlassPanel>
  );
}
