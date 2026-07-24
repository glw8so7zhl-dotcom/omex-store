import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  Package,
  PackageSearch,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { trackOrder, type TrackedOrder } from "@/features/tracking/track.functions";
import { formatPrice } from "@/lib/products";
import { whatsappUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { Container } from "@/components/site/Container";
import { PageHeader } from "@/components/site/PageHeader";
import { GlassPanel } from "@/components/site/GlassPanel";
import { CancelOrderButton } from "@/components/site/CancelOrderButton";
import { SummaryRow } from "@/components/site/SummaryRow";
import { TextField } from "@/components/site/TextField";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "تتبّع طلبك — OMEX Store" },
      { name: "description", content: "تتبّع حالة طلبك برقم الطلب وآخر 4 أرقام من هاتفك." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackPage,
});

const STEPS = [
  { key: "pending", label: "قيد الانتظار", icon: Clock },
  { key: "confirmed", label: "مؤكد", icon: CheckCircle2 },
  { key: "shipped", label: "تم الشحن", icon: Truck },
  { key: "delivered", label: "تم التوصيل", icon: Package },
] as const;

const PAYMENT_LABEL: Record<string, string> = {
  cod: "الدفع عند الاستلام",
  bank_transfer: "تحويل بنكي",
};

function StatusTracker({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-sale/10 border border-sale/30 px-4 py-3 text-sale text-sm">
        <XCircle className="h-4 w-4" />
        تم إلغاء هذا الطلب
      </div>
    );
  }
  const activeIndex = Math.max(0, STEPS.findIndex((s) => s.key === status));
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done = i <= activeIndex;
        const Icon = s.icon;
        return (
          <div key={s.key} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              className={cn(
                "grid place-items-center h-9 w-9 rounded-full transition",
                done ? "gradient-primary text-white shadow-glow-sm" : "bg-surface-2 text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span
              className={cn(
                "text-[10px] text-center leading-tight",
                done ? "text-foreground font-semibold" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

function TrackPage() {
  const [orderId, setOrderId] = useState("");
  const [last4, setLast4] = useState("");
  const [result, setResult] = useState<TrackedOrder | null>(null);
  const [notFound, setNotFound] = useState(false);

  const trackFn = useServerFn(trackOrder);
  const mutation = useMutation({
    mutationFn: trackFn,
    onSuccess: (res) => {
      if (res.found && res.order) {
        setResult(res.order);
        setNotFound(false);
      } else {
        setResult(null);
        setNotFound(true);
      }
    },
    onError: (e: Error) => toast.error(e.message ?? "تعذّر البحث. تأكد من البيانات."),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = orderId.trim();
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
      toast.error("أدخل رقم الطلب كاملاً كما وصلك في صفحة التأكيد");
      return;
    }
    if (!/^[0-9]{4}$/.test(last4.trim())) {
      toast.error("أدخل آخر 4 أرقام من رقم هاتفك");
      return;
    }
    mutation.mutate({ data: { orderId: id, phoneLast4: last4.trim() } });
  };

  return (
    <main className="pb-8">
      <Container size="md" className="py-6">
        <PageHeader
          title="تتبّع طلبك"
          subtitle="أدخل رقم الطلب (من صفحة التأكيد) وآخر 4 أرقام من هاتفك"
        />

        <GlassPanel tone="strong" pad="lg" className="mt-6">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_160px_auto] items-end">
            <TextField
              label="رقم الطلب"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
            />
            <TextField
              label="آخر 4 أرقام من الهاتف"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="0000"
              required
            />
            <Button type="submit" variant="gradient" size="pill" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner size="sm" className="text-white" /> : (
                <>
                  <PackageSearch className="h-4 w-4" />
                  تتبّع
                </>
              )}
            </Button>
          </form>
        </GlassPanel>

        {notFound && (
          <GlassPanel pad="lg" className="mt-4 text-center">
            <p className="text-sm text-sale font-semibold">لم نعثر على طلب مطابق</p>
            <p className="mt-1 text-xs text-muted-foreground">
              تأكد من رقم الطلب الكامل وآخر 4 أرقام من الهاتف المستخدم في الطلب.
            </p>
          </GlassPanel>
        )}

        {result && (
          <GlassPanel tone="strong" pad="lg" className="mt-4 space-y-4 animate-rise-in">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">رقم الطلب</div>
                <div className="font-mono text-sm font-bold">#{result.id.slice(0, 8)}</div>
              </div>
              <div className="text-left">
                <div className="text-xs text-muted-foreground">{formatDate(result.created_at)}</div>
                <Badge variant="glass" className="mt-1">
                  {PAYMENT_LABEL[result.payment_method] ?? result.payment_method}
                </Badge>
              </div>
            </div>

            <StatusTracker status={result.status} />

            <ul className="space-y-1.5 border-t border-white/10 pt-3">
              {result.items.map((it, idx) => (
                <li key={idx} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">
                    {it.product_name} × {it.qty}
                  </span>
                  <span className="font-semibold shrink-0">{formatPrice(it.line_total)}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 text-sm border-t border-white/10 pt-3">
              <SummaryRow label="المجموع الفرعي" value={formatPrice(result.subtotal)} />
              {result.discount > 0 && (
                <SummaryRow label="الخصم" value={`- ${formatPrice(result.discount)}`} accent="text-success" />
              )}
              <SummaryRow label="الشحن" value={formatPrice(result.shipping)} />
              <div className="border-t border-white/10 pt-2">
                <SummaryRow label="الإجمالي" value={formatPrice(result.total)} bold />
              </div>
            </div>

            <Button asChild variant="success" size="pill" className="w-full">
              <a
                href={whatsappUrl(`السلام عليكم، أريد الاستفسار عن طلبي رقم: ${result.id}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                استفسار عبر واتساب
              </a>
            </Button>

            <CancelOrderButton
              orderId={result.id}
              status={result.status}
              phoneLast4={last4.trim()}
              onCancelled={() => setResult({ ...result, status: "cancelled" })}
            />
          </GlassPanel>
        )}
      </Container>
      <Footer />
    </main>
  );
}
