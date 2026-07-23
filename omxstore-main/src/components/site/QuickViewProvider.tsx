import { createContext, useContext, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShoppingBag, Star, X } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { whatsappProductUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QtyStepper } from "@/components/site/QtyStepper";

type QuickViewCtx = { open: (p: Product) => void };
const Ctx = createContext<QuickViewCtx | null>(null);

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const { add } = useCart();
  const { has, toggle } = useWishlist();

  const open = (p: Product) => {
    setProduct(p);
    setQty(1);
  };

  const discount =
    product?.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;
  const fav = product ? has(product.id) : false;

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <Dialog open={!!product} onOpenChange={(v) => !v && setProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-0 gap-0 border-white/10 glass-strong">
          {product && (
            <div className="grid sm:grid-cols-2">
              <div className="relative aspect-square bg-gradient-to-br from-surface-2 to-surface p-6">
                {discount > 0 && (
                  <Badge variant="gradientSale" className="absolute top-3 right-3 z-10 text-xs px-2.5 py-1">
                    خصم {discount}%
                  </Badge>
                )}
                <img
                  src={product.image}
                  alt={product.name}
                  width={640}
                  height={640}
                  decoding="async"
                  className="h-full w-full object-contain drop-shadow-[0_20px_30px_rgba(37,99,235,0.35)]"
                />
              </div>
              <div className="p-5 space-y-3 min-w-0">
                <DialogHeader>
                  <DialogTitle className="text-right font-display text-lg font-black leading-tight">
                    {product.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-foreground">{product.rating}</span>
                  <span>({product.reviews})</span>
                  <span>•</span>
                  <span>{product.sales} مباع</span>
                </div>
                <div className="flex items-end gap-2 flex-wrap">
                  <span className="font-display text-2xl font-black text-gradient">
                    {formatPrice(product.price)}
                  </span>
                  {product.oldPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(product.oldPrice)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {product.description}
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-sm font-semibold">الكمية:</span>
                  <QtyStepper value={qty} max={product.stock} size="sm" onChange={setQty} />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="gradientGlow"
                    size="pill"
                    onClick={() => {
                      add(product, qty);
                      toast.success("تمت الإضافة للسلة");
                      setProduct(null);
                    }}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    أضف للسلة
                  </Button>
                  <Button
                    variant="glass"
                    size="pill"
                    aria-pressed={fav}
                    className={cn(fav && "text-sale")}
                    onClick={() => {
                      toggle(product.id);
                      toast.success(fav ? "أُزيل من المفضلة" : "أضيف للمفضلة");
                    }}
                  >
                    {fav ? "في المفضلة" : "المفضلة"}
                  </Button>
                </div>

                <Button asChild variant="link" size="sm" className="px-0">
                  <Link to="/products/$id" params={{ id: product.id }} onClick={() => setProduct(null)}>
                    عرض كل التفاصيل
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

export function useQuickView() {
  return useContext(Ctx);
}
