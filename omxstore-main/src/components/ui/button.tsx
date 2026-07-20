import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * OMEX Design System — Button
 *
 * Variants:
 *  - default / destructive / outline / secondary / ghost / link  (shadcn defaults)
 *  - gradient       primary CTA (gradient-primary + shadow-glow-sm)
 *  - gradientGlow   hero / checkout CTA (gradient-primary + shadow-glow)
 *  - glass          secondary CTA on dark surfaces
 *  - success        WhatsApp / positive action (bg-success)
 *  - saleGhost      subtle destructive/sale (bg-sale/10 text-sale)
 *
 * Sizes:
 *  - default / sm / lg / icon  (shadcn defaults, height h-8..h-10)
 *  - pill      h-11 rounded-2xl px-5     (form actions)
 *  - pillLg    h-12 rounded-2xl px-5     (primary CTAs)
 *  - iconPill  h-11 w-11 rounded-2xl     (icon-only actions)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-[color,background-color,border-color,box-shadow,transform,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "gradient-primary text-white font-bold shadow-glow-sm hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0",
        gradientGlow:
          "gradient-primary text-white font-bold shadow-glow hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0",
        glass:
          "glass font-bold hover:border-primary/40 hover:bg-primary/10 hover:-translate-y-0.5 active:translate-y-0",
        success:
          "bg-success text-white font-bold shadow-glow-sm hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0",
        saleGhost:
          "bg-sale/10 text-sale border border-sale/30 hover:bg-sale hover:text-white transition",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        pill: "h-11 rounded-2xl px-5 text-sm",
        pillLg: "h-12 rounded-2xl px-5 text-sm",
        iconPill: "h-11 w-11 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
