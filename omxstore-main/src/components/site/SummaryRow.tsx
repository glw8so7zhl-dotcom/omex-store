import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  bold?: boolean;
  accent?: string;
};

/**
 * Shared summary row used by cart + checkout order summary.
 */
export function SummaryRow({ label, value, bold, accent }: Props) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-bold" : "text-muted-foreground"}>{label}</span>
      <span
        className={cn(
          bold ? "font-display font-black text-lg text-gradient" : "font-semibold",
          accent,
        )}
      >
        {value}
      </span>
    </div>
  );
}
