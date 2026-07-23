import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, Inbox, Timer } from "lucide-react";
import { fetchProducts } from "@/lib/catalog";
import { isFlashActive } from "@/lib/products";
import { Container } from "@/components/site/Container";
import { PageHeader } from "@/components/site/PageHeader";
import { EmptyState } from "@/components/site/EmptyState";
import { ProductCard } from "@/components/site/ProductCard";
import { Footer } from "@/components/site/Footer";
import { GlassPanel } from "@/components/site/GlassPanel";
import { IconTile } from "@/components/site/IconTile";

export const Route = createFileRoute("/offers")({
  loader: async () => {
    const products = await fetchProducts();
    const offers = products
      .filter((p) => isFlashActive(p) || (p.oldPrice != null && p.oldPrice > p.price))
      .sort((a, b) => {
        const da = a.oldPrice ? (a.oldPrice - a.price) / a.oldPrice : 0;
        const db = b.oldPrice ? (b.oldPrice - b.price) / b.oldPrice : 0;
        return db - da;
      });
    return { offers };
  },
  head: () => ({
    meta: [
      { title: "العروض والخصومات — OMEX Store" },
      { name: "description", content: "أقوى عروض وخصومات متجر OMEX — لفترة محدودة." },
    ],
  }),
  component: OffersPage,
});

function useCountdownToMidnight(): string {
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
  return label;
}

function OffersPage() {
  const { offers } = Route.useLoaderData();
  const countdown = useCountdownToMidnight();

  return (
    <main className="pb-8">
      <Container size="xl" className="py-6">
        <GlassPanel tone="strong" pad="lg" className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-sale/30 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl" />
          </div>
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <IconTile icon={Flame} size="lg" tone="gradientSale" />
              <div className="min-w-0">
                <h1 className="font-display text-xl sm:text-2xl font-black">العروض والخصومات 🔥</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {offers.length} عرضاً نشطاً — بادر قبل انتهاء الوقت
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-sale/15 border border-sale/30 px-4 py-2.5 text-sale">
              <Timer className="h-4 w-4" />
              <span className="font-mono font-bold text-base tabular-nums" suppressHydrationWarning>
                {countdown}
              </span>
            </div>
          </div>
        </GlassPanel>

        {offers.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={Inbox}
              title="لا توجد عروض حالياً"
              description="تابعنا — عروض جديدة تُضاف باستمرار."
            />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {offers.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </Container>
      <Footer />
    </main>
  );
}
