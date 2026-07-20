import { cn } from "@/lib/utils";

/**
 * OMEX Design System — Skeleton
 * Premium shimmer sweep over a neutral base. Honors prefers-reduced-motion
 * (the sweep is neutralized globally in styles.css).
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-white/[0.06]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:content-['']",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
