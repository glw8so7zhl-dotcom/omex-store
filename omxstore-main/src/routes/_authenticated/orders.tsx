import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  Package,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/products";
import { whatsappUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { Container } from "@/components/site/Container";
import { PageHeader } from "@/components/site/PageHeader";
import { GlassPanel } from "@/components/site/GlassPanel";
import { EmptyState } from "@/components/site/EmptyState";
import { SummaryRow } from "@/components/site/SummaryRow";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "طلباتي — OMEX Store" }] }),
  component: OrdersPage,
});

type OrderItem = { order_id: string; product_name: string; qty: number; line_total: number };
type Order = {
  id: string;
  created_at: string;
  total: number;
  subtotal: number;
  shipping: number;
  discount: number;
  status: string;
  payment_method: string;
  items: OrderItem[];
};

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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function OrderTracker({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-sale/10 border border-sale/30 px-4 py-3 text-sale text-sm">
        <XCircle className="h-4 w-4" />
        تم إلغاء هذا الطلب
      </div>
    );
  }
  const activeIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.key === status),
  );
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
                done
                  ? "gradient-primary text-white shadow-glow-sm"
                  : "bg-surface-2 text-muted-foreground",
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

function OrdersPage() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Order[]> => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id,created_at,total,subtotal,shipping,discount,status,payment_method")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const list = (orders ?? []) as unknown as Array<Omit<Order, "items">>;
      const ids = list.map((o) => o.id);
      const itemsByOrder = new Map<string, OrderItem[]>();

      if (ids.length) {
        const { data: items, error: itemsErr } = await supabase
          .from("order_items")
          .select("order_id,product_name,qty,line_total")
          .in("order_id", ids);
        if (itemsErr) throw itemsErr;
        for (const it of (items ?? []) as unknown as OrderItem[]) {
          const arr = itemsByOrder.get(it.order_id) ?? [];
          arr.push(it);
          itemsByOrder.set(it.order_id, arr);
        }
      }

      return list.map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] }));
    },
  });

  return (
    <main className="pb-8">
      <Container size="lg" className="py-6">
        <PageHeader title="طلباتي" subtitle="تابع حالة طلباتك السابقة" />

        {isLoading || !user ? (
          <PageSpinner />
        ) : isError ? (
          <div className="mt-10">
            <EmptyState
              icon={XCircle}
              title="تعذّر تحميل الطلبات"
              description="حدث خطأ أثناء جلب طلباتك. حاول تحديث الصفحة."
            />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={ShoppingBag}
              title="لا توجد طلبات بعد"
              description="عند إتمام أول طلب ستظهر تفاصيله وحالته هنا."
              action={
                <Button asChild variant="gradient" size="pill">
                  <Link to="/">ابدأ التسوق</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {data.map((o) => (
              <GlassPanel key={o.id} tone="strong" pad="lg" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">رقم الطلب</div>
                    <div className="font-mono text-sm font-bold">#{o.id.slice(0, 8)}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground">{formatDate(o.created_at)}</div>
                    <Badge variant="glass" className="mt-1">
                      {PAYMENT_LABEL[o.payment_method] ?? o.payment_method}
                    </Badge>
                  </div>
                </div>

                <OrderTracker status={o.status} />

                <ul className="space-y-1.5 border-t border-white/10 pt-3">
                  {o.items.map((it, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-muted-foreground">
                        {it.product_name} × {it.qty}
                      </span>
                      <span className="font-semibold shrink-0">{formatPrice(it.line_total)}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-2 text-sm border-t border-white/10 pt-3">
                  <SummaryRow label="المجموع الفرعي" value={formatPrice(o.subtotal)} />
                  {o.discount > 0 && (
                    <SummaryRow
                      label="الخصم"
                      value={`- ${formatPrice(o.discount)}`}
                      accent="text-success"
                    />
                  )}
                  <SummaryRow label="الشحن" value={formatPrice(o.shipping)} />
                  <div className="border-t border-white/10 pt-2">
                    <SummaryRow label="الإجمالي" value={formatPrice(o.total)} bold />
                  </div>
                </div>

                <Button asChild variant="success" size="pill" className="w-full">
                  <a
                    href={whatsappUrl(`السلام عليكم، أريد الاستفسار عن طلبي رقم: ${o.id}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" />
                    استفسار عبر واتساب
                  </a>
                </Button>
              </GlassPanel>
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
