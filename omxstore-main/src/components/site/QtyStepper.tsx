import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Shared quantity stepper used in cart rows and product detail.
 * Keeps interaction + a11y consistent across the app.
 */
export function QtyStepper({ value, onChange, min = 1, max = 999, size = "md", className }: Props) {
  const btn = size === "sm" ? "w-9 h-9" : "w-11 h-11";
  const width = size === "sm" ? "w-8" : "w-12";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className={cn("glass rounded-2xl flex items-center", className)}>
      <button
        type="button"
        aria-label="إنقاص الكمية"
        onClick={dec}
        disabled={value <= min}
        className={cn(btn, "grid place-items-center hover:bg-white/5 rounded-r-2xl disabled:opacity-40 disabled:cursor-not-allowed")}
      >
        <Minus className={icon} />
      </button>
      <span className={cn(width, "text-center font-bold tabular-nums")} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="زيادة الكمية"
        onClick={inc}
        disabled={value >= max}
        className={cn(btn, "grid place-items-center hover:bg-white/5 rounded-l-2xl disabled:opacity-40 disabled:cursor-not-allowed")}
      >
        <Plus className={icon} />
      </button>
    </div>
  );
}
