import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, ShoppingBag, Star } from "lucide-react";
import { motion } from "motion/react";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { whatsappProductUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const fav = has(product.id);
  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group relative"
    >
      <div className="glass rounded-3xl overflow-hidden shadow-card transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-glow">
        <Link
          to="/products/$id"
          params={{ id: product.id }}
          className="block relative aspect-square bg-gradient-to-br from-surface-2 to-surface p-4"
        >
          {discount > 0 && (
            <span className="absolute top-3 right-3 z-10 gradient-sale text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-glow-sm">
              -{discount}%
            </span>
          )}
          <button
            aria-label={fav ? "إزالة من المفضلة" : "أضف للمفضلة"}
            aria-pressed={fav}
            onClick={(e) => {
              e.preventDefault();
              toggle(product.id);
              toast.success(fav ? "أُزيل من المفضلة" : "أضيف للمفضلة");
            }}
            className={cn(
              "absolute top-3 left-3 z-10 grid place-items-center h-9 w-9 rounded-full glass transition hover:bg-sale/20 hover:text-sale",
              fav && "text-sale",
            )}
          >
            <Heart className={cn("h-4 w-4", fav && "fill-sale")} />
          </button>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/10" />
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            width={640}
            height={640}
            className="relative z-0 h-full w-full object-contain drop-shadow-[0_20px_30px_rgba(37,99,235,0.35)] group-hover:scale-110 transition-transform duration-500"
          />
          {/* premium hover sheen */}
          <span className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
            <span className="absolute inset-y-0 right-0 w-1/3 -skew-x-12 bg-[image:var(--gradient-sheen)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:animate-[sheen_0.9s_ease-out]" />
          </span>
        </Link>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-foreground">{product.rating}</span>
            <span>({product.reviews})</span>
            <span className="mx-1">•</span>
            <span>{product.sales} مباع</span>
          </div>

          <Link
            to="/products/$id"
            params={{ id: product.id }}
            className="block font-semibold text-sm leading-snug line-clamp-2 min-h-10 hover:text-primary-glow transition"
          >
            {product.name}
          </Link>

          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="text-lg font-black text-gradient font-display">
                {formatPrice(product.price)}
              </div>
              {product.oldPrice && (
                <div className="text-[11px] text-muted-foreground line-through">
                  {formatPrice(product.oldPrice)}
                </div>
              )}
            </div>
            <span
              className={`text-[10px] px-2 py-1 rounded-full ${
                product.stock > 10
                  ? "bg-success/15 text-success"
                  : "bg-sale/15 text-sale"
              }`}
            >
              {product.stock > 10 ? "متوفر" : `${product.stock} فقط`}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                add(product);
                toast.success("أضيف للسلة");
              }}
              className="flex-1 h-10 rounded-xl gradient-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-glow-sm hover:brightness-110 active:scale-95 transition"
            >
              <ShoppingBag className="h-4 w-4" />
              أضف للسلة
            </button>
            <a
              href={whatsappProductUrl(product)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="اطلب عبر واتساب"
              className="h-10 w-10 rounded-xl bg-success/15 text-success border border-success/30 grid place-items-center hover:bg-success hover:text-white transition"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
