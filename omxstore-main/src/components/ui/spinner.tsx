import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

/**
 * OMEX Design System — Spinner
 * Unified loading indicator used across buttons and pages.
 */
export function Spinner({ size = "md", className, label = "جاري التحميل" }: Props) {
  const dim = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-5 w-5";
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn("animate-spin text-primary-glow", dim, className)}
    />
  );
}

/** Full-viewport loading state for route transitions. */
export function PageSpinner({ label = "جاري التحميل" }: { label?: string }) {
  return (
    <div className="min-h-[50vh] grid place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="relative grid place-items-center">
          <span className="absolute h-14 w-14 rounded-full bg-primary/20 blur-xl animate-pulse-glow" />
          <Spinner size="lg" label={label} />
        </div>
        <span className="text-xs">{label}...</span>
      </div>
    </div>
  );
}
