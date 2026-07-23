import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, Flame, MessageCircle, Quote, Sparkles, Star, Truck, ShieldCheck, Timer } from "lucide-react";
import heroBg from "@/assets/hero-bg.webp";
import type { Product, Category } from "@/lib/products";
import { fetchProducts, fetchCategories } from "@/lib/catalog";
import { fetchTopReviews, type TopReview } from "@/lib/reviews";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { CategoryChip } from "@/components/site/CategoryChip";
import { ProductCard } from "@/components/site/ProductCard";
import { Footer } from "@/components/site/Footer";
import { GlassPanel } from "@/components/site/GlassPanel";
import { HeroCanvas } from "@/components/three/HeroCanvas";
import { whatsappUrl } from "@/lib/whatsapp";
import { SITE_URL } from "@/lib/site";
import { prefersReducedMotion } from "@/lib/motion";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [products, categories, testimonials] = await Promise.all([
      fetchProducts(),
      fetchCategories(),
      fetchTopReviews(6),
    ]);
    return { products, categories, testimonials };
  },
  head: () => ({
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  component: HomePage,
});

function HomePage() {
  const { products, categories, testimonials } = Route.useLoaderData();
  const flash = products.filter((p) => p.flashSale);
  const featured = products.filter((p) => p.featured);

  return (
    <main className="pb-8">
      <HeroSection />
      <CategoriesSection items={categories} />
      <FlashSaleSection items={flash} />
      <FeaturesRow />
      <FeaturedSection items={featured} />
      <NewArrivalsSection items={products} />
      <RecentlyViewedSection all={products} />
      <TestimonialsSection items={testimonials} />
      <Footer />
    </main>
  );
}

function RecentlyViewedSection({ all }: { all: Product[] }) {
  const [items, setItems] = useState<Product[]>([]);
  useEffect(() => {
    const slugs = getRecentlyViewed();
    if (!slugs.length) return;
    const bySlug = new Map(all.map((p) => [p.id, p]));
    setItems(slugs.map((s) => bySlug.get(s)).filter((p): p is Product => !!p).slice(0, 4));
  }, [all]);
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionHeader title="شاهدتها مؤخراً" subtitle="تابع من حيث توقفت" />
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}

function TestimonialsSection({ items }: { items: TopReview[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionHeader title="آراء العملاء" subtitle="تجارب حقيقية من عملائنا" />
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((r, i) => (
          <GlassPanel key={i} pad="lg" className="space-y-3">
            <Quote className="h-6 w-6 text-primary-glow" />
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{r.body}</p>
            <div className="flex items-center gap-1 pt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={
                    n <= r.rating ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4 text-muted-foreground/40"
                  }
                />
              ))}
            </div>
          </GlassPanel>
        ))}
      </div>
    </section>
  );
}

function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".hero-item", {
        y: 24,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.12,
      });
    },
    { scope: heroRef },
  );
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="h-full w-full object-cover opacity-40"
          width={1600}
          height={907}
        />
        <div className="absolute inset-0 gradient-hero" />
      </div>

      {/* floating orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl animate-float-slow" />
        <div className="absolute top-40 -left-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl animate-float-slow [animation-delay:2s]" />
        <div className="absolute bottom-0 right-1/3 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl animate-float-slow [animation-delay:4s]" />
      </div>

      {/* cinematic 3D layer (lazy, client-only, capability-gated; static hero shows otherwise) */}
      <HeroCanvas />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-14 md:py-24">
        <div ref={heroRef} className="max-w-2xl">
          <div className="hero-item inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
            <span className="text-muted-foreground">توصيل لجميع المحافظات اليمنية</span>
          </div>
          <h1 className="hero-item mt-5 font-display text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
            مرحباً بك في <br />
            <span className="text-gradient">مستقبل التسوق</span>
          </h1>
          <p className="hero-item mt-4 text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
            أفضل المنتجات الأصلية بأفضل الأسعار — تجربة تسوق سلسة، دفع عند الاستلام،
            وتوصيل سريع لجميع المحافظات.
          </p>

          <div className="hero-item mt-7 flex flex-wrap gap-3">
            <Link
              to="/categories"
              className="group relative inline-flex items-center gap-2 rounded-2xl gradient-primary px-6 py-3 text-sm font-bold text-white shadow-glow hover:brightness-110 transition"
            >
              تسوق الآن
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition" />
            </Link>
            <a
              href={whatsappUrl("مرحبا، أريد الاستفسار عن منتجاتكم")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl glass px-6 py-3 text-sm font-bold hover:bg-success/20 hover:border-success/40 transition"
            >
              <MessageCircle className="h-4 w-4 text-success" />
              اطلب عبر واتساب
            </a>
          </div>

          <div className="hero-item mt-8 grid grid-cols-3 gap-3 max-w-md">
            <Stat value="+10K" label="عميل سعيد" />
            <Stat value="+500" label="منتج أصلي" />
            <Stat value="24/7" label="دعم فوري" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass rounded-2xl px-3 py-3 text-center">
      <div className="font-display text-lg font-black text-gradient">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function CategoriesSection({ items }: { items: Category[] }) {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-10">
      <SectionHeader title="تسوّق حسب القسم" subtitle="اختر ما يناسبك من عالم من المنتجات" to="/categories" />
      <div className="mt-6 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-4">
        {items.map((c, i) => (
          <CategoryChip key={c.id} category={c} index={i} />
        ))}
      </div>
    </section>
  );
}

function FlashSaleSection({ items }: { items: Product[] }) {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-8">
      <div className="glass-strong rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-card">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-sale/30 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl" />
        </div>

        <div className="relative flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid place-items-center h-11 w-11 rounded-2xl gradient-sale shadow-glow-sm shrink-0">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-2xl font-black truncate">
                🔥 عروض اليوم
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                خصومات محدودة — بادر قبل النفاد
              </p>
            </div>
          </div>
          <CountdownBadge />
        </div>

        <div className="relative -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 pb-2">
            {items.map((p, i) => (
              <div key={p.id} className="w-[220px] sm:w-[250px] shrink-0">
                <ProductCard product={p} index={i} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CountdownBadge() {
  // Live countdown to end of day — replaces the old hard-coded string.
  const [label, setLabel] = useState("--:--:--");
  useEffect(() => {
    const target = new Date();
    target.setHours(24, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const ms = Math.max(0, target.getTime() - Date.now());
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setLabel(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-sale/15 border border-sale/30 px-3 py-2 text-sale">
      <Timer className="h-4 w-4" />
      <span className="font-mono font-bold text-sm tabular-nums" suppressHydrationWarning>
        {label}
      </span>
    </div>
  );
}

function FeaturesRow() {
  const feats = [
    { icon: Truck, title: "توصيل سريع", sub: "لجميع المحافظات" },
    { icon: ShieldCheck, title: "منتجات أصلية", sub: "مضمونة 100%" },
    { icon: MessageCircle, title: "دعم واتساب", sub: "على مدار الساعة" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid grid-cols-3 gap-3">
        {feats.map((f) => (
          <div key={f.title} className="glass rounded-2xl p-3 sm:p-4 flex items-center gap-3">
            <div className="grid place-items-center h-10 w-10 rounded-xl gradient-primary shadow-glow-sm shrink-0">
              <f.icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold truncate">{f.title}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{f.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedSection({ items }: { items: Product[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionHeader title="الأكثر مبيعاً" subtitle="اختيارات العملاء المفضّلة" />
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}

function NewArrivalsSection({ items }: { items: Product[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionHeader title="وصل حديثاً" subtitle="أحدث المنتجات في المتجر" />
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  subtitle,
  to,
}: {
  title: string;
  subtitle?: string;
  to?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-black">{title}</h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {to && (
        <Link
          to={to as never}
          className="text-xs sm:text-sm text-primary-glow font-semibold hover:underline shrink-0 flex items-center gap-1"
        >
          عرض الكل
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
