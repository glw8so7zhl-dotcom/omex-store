import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { whatsappUrl } from "@/lib/whatsapp";
import { Footer } from "@/components/site/Footer";
import { QtyStepper } from "@/components/site/QtyStepper";
import { SummaryRow } from "@/components/site/SummaryRow";
import { Container } from "@/components/site/Container";
import { PageHeader } from "@/components/site/PageHeader";
import { GlassPanel } from "@/components/site/GlassPanel";
import { EmptyState } from "@/components/site/EmptyState";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "سلة التسوق — OMEX Store" },
      { name: "description", content: "مراجعة منتجات سلتك وإتمام الطلب." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, total, count, setQty, remove, clear } = useCart();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const shipping = total > 0 ? 3000 : 0;
  const grand = Math.max(0, total - discount + shipping);

  const applyCoupon = () => {
    if (coupon.trim().toUpperCase() === "OMEX10") {
      setDiscount(Math.round(total * 0.1));
      toast.success("تم تطبيق الكوبون: خصم 10%");
    } else {
      toast.error("كود الكوبون غير صحيح");
    }
  };

  const orderViaWhatsapp = () => {
    const lines = items.map(
      (i, idx) => `${idx + 1}) ${i.product.name} × ${i.qty} — ${formatPrice(i.product.price * i.qty)}`,
    );
    const msg = [
      "السلام عليكم، أريد إتمام هذا الطلب:",
      "",
      ...lines,
      "",
      `المجموع: ${formatPrice(grand)}`,
    ].join("\n");
    window.open(whatsappUrl(msg), "_blank");
  };

  return (
    <main className="pb-8">
      <Container size="lg" className="py-6">
        <PageHeader
          title="سلة التسوق"
          subtitle={`${count} منتج في السلة`}
          actions={
            items.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  clear();
                  toast.success("تم إفراغ السلة");
                }}
                className="text-xs text-sale hover:underline"
              >
                إفراغ السلة
              </button>
            ) : null
          }
        />

        {items.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={ShoppingBag}
              title="سلتك فارغة"
              description="ابدأ باستكشاف المنتجات وأضف ما يعجبك."
              action={
                <Button asChild variant="gradient" size="pill">
                  <Link to="/">
                    تسوّق الآن
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.div
                    key={item.product.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <GlassPanel
                      radius="2xl"
                      pad="sm"
                      shadow={false}
                      className="grid grid-cols-[80px_minmax(0,1fr)_auto] sm:grid-cols-[100px_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4"
                    >
                      <Link
                        to="/products/$id"
                        params={{ id: item.product.id }}
                        className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-surface-2 to-surface grid place-items-center p-2 shrink-0"
                      >
                        <img
                          src={item.product.image}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="max-h-full max-w-full object-contain"
                        />
                      </Link>
                      <div className="min-w-0">
                        <Link
                          to="/products/$id"
                          params={{ id: item.product.id }}
                          className="font-semibold text-sm line-clamp-2 hover:text-primary-glow"
                        >
                          {item.product.name}
                        </Link>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.product.brand}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <QtyStepper
                            value={item.qty}
                            size="sm"
                            onChange={(v) => setQty(item.product.id, v)}
                          />
                          <div className="font-display font-black text-gradient text-base sm:text-lg">
                            {formatPrice(item.product.price * item.qty)}
                          </div>
                        </div>
                      </div>
                      <button
                        aria-label="حذف المنتج"
                        onClick={() => remove(item.product.id)}
                        className="self-start h-9 w-9 grid place-items-center rounded-xl bg-sale/10 text-sale hover:bg-sale hover:text-white transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </GlassPanel>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Summary */}
            <aside className="lg:sticky lg:top-24 h-fit">
              <GlassPanel tone="strong" pad="lg" className="space-y-4">
                <h2 className="font-display text-lg font-black">ملخص الطلب</h2>

                <div className="flex gap-2">
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder="كود الخصم"
                    aria-label="كود الخصم"
                    className="flex-1 h-11 rounded-2xl bg-surface/70 border border-white/10 px-3 text-sm placeholder:text-muted-foreground focus:border-primary/50 outline-none"
                  />
                  <Button type="button" onClick={applyCoupon} variant="gradient" size="pill">
                    تطبيق
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  <SummaryRow label="المجموع الفرعي" value={formatPrice(total)} />
                  {discount > 0 && (
                    <SummaryRow label="الخصم" value={`- ${formatPrice(discount)}`} accent="text-success" />
                  )}
                  <SummaryRow label="الشحن" value={formatPrice(shipping)} />
                  <div className="border-t border-white/10 pt-3">
                    <SummaryRow label="الإجمالي" value={formatPrice(grand)} bold />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => navigate({ to: "/checkout" })}
                  variant="gradientGlow"
                  size="pillLg"
                  className="w-full"
                >
                  إتمام الشراء
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  onClick={orderViaWhatsapp}
                  variant="success"
                  size="pillLg"
                  className="w-full"
                >
                  <MessageCircle className="h-4 w-4" />
                  اطلب عبر واتساب
                </Button>

                <p className="text-[11px] text-muted-foreground text-center">
                  الدفع عند الاستلام متاح لجميع المحافظات
                </p>
              </GlassPanel>
            </aside>
          </div>
        )}
      </Container>
      <Footer />
    </main>
  );
}
