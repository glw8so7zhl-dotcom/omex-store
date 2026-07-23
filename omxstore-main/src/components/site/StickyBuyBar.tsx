import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Mobile-only sticky purchase bar for the product page. Appears after the
 * user scrolls past the hero, giving a persistent add-to-cart CTA — a strong
 * conversion lever on long product pages.
 */
export function StickyBuyBar({ product }: { product: Product }) {
  const { add } = useCart();
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduce ? false : { y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: 80, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 inset-x-0 z-40 md:hidden p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
          <div className="glass-strong rounded-2xl shadow-elevated flex items-center gap-3 p-2.5">
            <div className="min-w-0 flex-1 pr-1">
              <div className="text-[11px] text-muted-foreground truncate">{product.name}</div>
              <div className="font-display font-black text-gradient text-base leading-tight">
                {formatPrice(product.price)}
              </div>
            </div>
            <Button
              variant="gradientGlow"
              size="pill"
              className="shrink-0"
              onClick={() => {
                add(product, 1);
                toast.success("تمت الإضافة للسلة");
              }}
            >
              <ShoppingBag className="h-4 w-4" />
              أضف للسلة
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
