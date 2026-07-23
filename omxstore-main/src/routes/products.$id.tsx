import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Package,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatPrice } from "@/lib/products";
import { fetchProductBySlug, fetchProducts } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import { cn } from "@/lib/utils";
import { whatsappProductUrl } from "@/lib/whatsapp";
import { ProductCard } from "@/components/site/ProductCard";
import { ShareButtons } from "@/components/site/ShareButtons";
import { StickyBuyBar } from "@/components/site/StickyBuyBar";
import { ProductReviews } from "@/components/site/ProductReviews";
import { Footer } from "@/components/site/Footer";
import { QtyStepper } from "@/components/site/QtyStepper";
import { Container } from "@/components/site/Container";
import { GlassPanel } from "@/components/site/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/products/$id")({
  loader: async ({ params }) => {
    const [product, all] = await Promise.all([fetchProductBySlug(params.id), fetchProducts()]);
    if (!product) throw notFound();
    const related = all
      .filter((p) => p.id !== product.id && p.category === product.category)
      .slice(0, 4);
    return { product, related };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name} — OMEX Store` },
          { name: "description", content: loaderData.product.description },
          { property: "og:title", content: `${loaderData.product.name} — OMEX` },
          { property: "og:description", content: loaderData.product.description },
          { property: "og:image", content: loaderData.product.image },
        ]
      : [{ title: "المنتج غير موجود" }],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="min-h-[60vh] grid place-items-center px-4">
      <div className="text-center">
        <h1 className="font-display text-2xl font-black">المنتج غير موجود</h1>
        <Link to="/" className="mt-4 inline-block text-primary-glow underline">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  ),
});

function ProductPage() {
  const { product, related } = Route.useLoaderData();
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const navigate = useNavigate();
  const fav = has(product.id);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    recordRecentlyViewed(product.id);
  }, [product.id]);

  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;

  // Product structured data (schema.org) — strengthens ecommerce SEO.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.image,
    description: product.description,
    sku: product.id,
    brand: { "@type": "Brand", name: product.brand },
    ...(product.reviews > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviews,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "YER",
      price: product.price,
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <main className="pb-8">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container size="xl" className="py-6">
        <nav className="text-xs text-muted-foreground flex items-center gap-2">
          <Link to="/" className="hover:text-foreground">
            الرئيسية
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {/* Gallery */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <GlassPanel radius="3xl" pad="none" className="aspect-square relative overflow-hidden">
              {discount > 0 && (
                <Badge
                  variant="gradientSale"
                  className="absolute top-4 right-4 z-10 text-xs px-3 py-1.5"
                >
                  خصم {discount}%
                </Badge>
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-fuchsia-500/10" />
              <img
                src={product.image}
                alt={product.name}
                decoding="async"
                fetchPriority="high"
                width={640}
                height={640}
                className="relative h-full w-full object-contain p-8 drop-shadow-[0_30px_50px_rgba(37,99,235,0.4)]"
              />
            </GlassPanel>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  aria-label={`صورة مصغّرة ${i + 1}`}
                  className={`aspect-square rounded-2xl glass grid place-items-center p-2 hover:border-primary/50 transition ${
                    i === 0 ? "border-primary/60 ring-2 ring-primary/20" : ""
                  }`}
                >
                  <img
                    src={product.image}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    width={160}
                    height={160}
                    className="max-h-full max-w-full object-contain"
                  />
                </button>
              ))}
            </div>
          </motion.div>

          {/* Info */}
          <div>
            <div className="text-xs text-primary-glow font-semibold">{product.brand}</div>
            <h1 className="mt-2 font-display text-2xl md:text-3xl font-black leading-tight">
              {product.name}
            </h1>

            <div className="mt-3 flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-bold">{product.rating}</span>
                <span className="text-muted-foreground">({product.reviews} تقييم)</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{product.sales} تم بيعه</span>
            </div>

            <GlassPanel radius="2xl" pad="md" shadow={false} className="mt-5">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="font-display text-3xl font-black text-gradient">
                  {formatPrice(product.price)}
                </div>
                {product.oldPrice && (
                  <div className="text-sm text-muted-foreground line-through">
                    {formatPrice(product.oldPrice)}
                  </div>
                )}
                {discount > 0 && (
                  <Badge variant="sale" className="rounded-full">وفّر {discount}%</Badge>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <Badge
                  variant={product.stock > 10 ? "success" : "sale"}
                  className="rounded-full"
                >
                  {product.stock > 10 ? "متوفر في المخزون" : `تبقى ${product.stock} فقط`}
                </Badge>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" />
                  توصيل خلال 2-5 أيام
                </span>
              </div>
            </GlassPanel>

            <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>

            <div className="mt-5">
              <h3 className="font-bold mb-2 text-sm">المميزات:</h3>
              <ul className="space-y-1.5 text-sm">
                {product.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-glow shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quantity */}
            <div className="mt-6 flex items-center gap-3">
              <span className="text-sm font-semibold">الكمية:</span>
              <QtyStepper value={qty} max={product.stock} onChange={setQty} />
            </div>

            {/* Actions */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="glass"
                size="pillLg"
                onClick={() => {
                  add(product, qty);
                  toast.success("تمت الإضافة للسلة");
                }}
              >
                <ShoppingBag className="h-4 w-4" />
                إضافة للسلة
              </Button>
              <Button
                variant="gradientGlow"
                size="pillLg"
                onClick={() => {
                  add(product, qty);
                  navigate({ to: "/checkout" });
                }}
              >
                شراء الآن
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button asChild variant="success" size="pillLg" className="col-span-2">
                <a href={whatsappProductUrl(product)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  اطلب عبر واتساب
                </a>
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="glass"
                size="pill"
                aria-pressed={fav}
                className={cn("h-10 text-xs", fav && "text-sale")}
                onClick={() => {
                  toggle(product.id);
                  toast.success(fav ? "أُزيل من المفضلة" : "أضيف للمفضلة");
                }}
              >
                <Heart className={cn("h-4 w-4", fav && "fill-sale")} />
                {fav ? "في المفضلة" : "المفضلة"}
              </Button>
              <ShareButtons title={product.name} />
            </div>

            {/* Trust */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <TrustBadge icon={Truck} title="توصيل سريع" />
              <TrustBadge icon={ShieldCheck} title="ضمان أصلي" />
              <TrustBadge icon={Package} title="دفع عند الاستلام" />
            </div>
          </div>
        </div>

        <ProductReviews productDbId={product.dbId} />

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-black mb-6">منتجات ذات صلة</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </Container>
      <StickyBuyBar product={product} />
      <Footer />
    </main>
  );
}

function TrustBadge({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <GlassPanel radius="2xl" pad="sm" shadow={false} className="text-center p-3">
      <Icon className="h-5 w-5 mx-auto text-primary-glow" />
      <div className="mt-1.5 text-[11px] font-semibold">{title}</div>
    </GlassPanel>
  );
}

