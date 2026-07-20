import { motion } from "motion/react";
import type { Category } from "@/lib/products";
import { cn } from "@/lib/utils";

export function CategoryChip({
  category,
  index = 0,
  onClick,
  active = false,
}: {
  category: Category;
  index?: number;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.95 }}
      className="group flex flex-col items-center gap-2 min-w-0"
    >
      <div
        className={cn(
          "relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br grid place-items-center shadow-glow-sm overflow-hidden transition",
          category.gradient,
          active && "ring-2 ring-white/80 ring-offset-2 ring-offset-background",
        )}
      >
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition" />
        <span className="relative text-3xl sm:text-4xl">{category.icon}</span>
        <div className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-white/20 blur-xl group-hover:scale-125 transition" />
      </div>
      <span
        className={cn(
          "text-[11px] sm:text-xs font-semibold text-center leading-tight truncate max-w-full",
          active ? "text-foreground" : "",
        )}
      >
        {category.name}
      </span>
    </motion.button>
  );
}
