import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  BellRing,
  CalendarDays,
  DollarSign,
  Gem,
  MessageCircleQuestion,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { GlassPanel } from "@/components/site/GlassPanel";
import { IconTile } from "@/components/site/IconTile";
import { PageSpinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/products";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "غرفة القيادة — OMEX Admin" }] }),
  component: DashboardPage,
});

type OrderRow = {
  id: string;
  customer_name: string | null;
  total: number | string | null;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغى",
};

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-command-center"],
    queryFn: async () => {
      const [
        ordersRes,
        productsRes,
        customersRes,
        pendingQRes,
        pendingRRes,
        inventoryRes,
        alertsRes,
        ledgerRes,
        referralsRes,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("id,customer_name,total,status,created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("products")
          .select("name,sales_count,stock")
          .order("sales_count", { ascending: false })
          .limit(5),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("product_questions").select("id", { count: "exact", head: true }).is("answer", null),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("inventory").select("stock,low_stock_threshold"),
        supabase.from("product_alerts").select("kind"),
        supabase.from("loyalty_ledger").select("points,user_id"),
        supabase.from("referrals").select("referred_user_id", { count: "exact", head: true }),
      ]);

      const orders = (ordersRes.data ?? []) as unknown as OrderRow[];
      const active = orders.filter((o) => o.status !== "cancelled");
      const today = startOfToday();
      const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;

      const sum = (list: OrderRow[]) => list.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const todayOrders = active.filter((o) => new Date(o.created_at).getTime() >= today);
      const weekOrders = active.filter((o) => new Date(o.created_at).getTime() >= weekAgo);

      // Last 14 days, oldest → newest.
      const days: Array<{ label: string; total: number }> = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const next = d.getTime() + 24 * 3600 * 1000;
        const t = sum(
          active.filter((o) => {
            const ts = new Date(o.created_at).getTime();
            return ts >= d.getTime() && ts < next;
          }),
        );
        days.push({ label: String(d.getDate()), total: t });
      }

      const inv = (inventoryRes.data ?? []) as unknown as Array<{
        stock: number;
        low_stock_threshold: number | null;
      }>;
      const lowStock = inv.filter((r) => r.stock <= (r.low_stock_threshold ?? 5)).length;

      const alerts = (alertsRes.data ?? []) as unknown as Array<{ kind: string }>;
      const waitingRestock = alerts.filter((a) => a.kind === "restock").length;

      const ledger = (ledgerRes.data ?? []) as unknown as Array<{ points: number; user_id: string }>;
      const pointsNet = ledger.reduce((s, r) => s + (r.points ?? 0), 0);
      const pointsMembers = new Set(ledger.map((r) => r.user_id)).size;

      return {
        revenueTotal: sum(active),
        revenueToday: sum(todayOrders),
        revenueWeek: sum(weekOrders),
        ordersToday: todayOrders.length,
        ordersTotal: active.length,
        aov: active.length ? Math.round(sum(active) / active.length) : 0,
        customers: customersRes.count ?? 0,
        pendingOrders: orders.filter((o) => o.status === "pending").length,
        pendingQuestions: pendingQRes.count ?? 0,
        pendingReviews: pendingRRes.count ?? 0,
        lowStock,
        waitingRestock,
        pointsNet,
        pointsMembers,
        referrals: referralsRes.count ?? 0,
        topProducts: (productsRes.data ?? []) as unknown as Array<{
          name: string;
          sales_count: number | null;
          stock: number | null;
        }>,
        recentOrders: orders.slice(0, 5),
        days,
      };
    },
  });

  return (
    <AdminShell title="غرفة القيادة" subtitle="نبض متجرك الآن — أرقام حيّة وقوائم تتطلب انتباهك">
      {isLoading || !data ? (
        <PageSpinner />
      ) : (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={DollarSign} label="إيراد اليوم" value={formatPrice(data.revenueToday)} highlight />
            <Stat icon={ShoppingBag} label="طلبات اليوم" value={data.ordersToday.toLocaleString("ar-EG")} />
            <Stat icon={CalendarDays} label="إيراد الأسبوع" value={formatPrice(data.revenueWeek)} />
            <Stat icon={TrendingUp} label="متوسط قيمة الطلب" value={formatPrice(data.aov)} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={DollarSign} label="إجمالي الإيرادات" value={formatPrice(data.revenueTotal)} />
            <Stat icon={ShoppingBag} label="إجمالي الطلبات" value={data.ordersTotal.toLocaleString("ar-EG")} />
            <Stat icon={Users} label="العملاء المسجّلون" value={data.customers.toLocaleString("ar-EG")} />
            <Stat
              icon={Gem}
              label="نقاط مُستحقة"
              value={`${data.pointsNet.toLocaleString("ar-EG")} نقطة`}
              sub={`≈ ${formatPrice(data.pointsNet * 10)} · ${data.pointsMembers} عضو · ${data.referrals} إحالة`}
            />
          </div>

          {/* Needs attention */}
          <GlassPanel pad="md">
            <h2 className="font-display text-sm font-black mb-3">يتطلب انتباهك</h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              <Attention to="/admin/orders" icon={ShoppingBag} label="طلبات قيد الانتظار" count={data.pendingOrders} />
              <Attention to="/admin/questions" icon={MessageCircleQuestion} label="أسئلة بلا إجابة" count={data.pendingQuestions} />
              <Attention to="/admin/reviews" icon={Star} label="تقييمات للاعتماد" count={data.pendingReviews} />
              <Attention to="/admin/inventory" icon={AlertCircle} label="مخزون منخفض" count={data.lowStock} />
              <Attention to="/admin/inventory" icon={BellRing} label="ينتظرون التوفر" count={data.waitingRestock} />
            </div>
          </GlassPanel>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* 14-day sales */}
            <GlassPanel pad="md">
              <h2 className="font-display text-sm font-black mb-3">مبيعات آخر 14 يوماً</h2>
              <SalesBars days={data.days} />
            </GlassPanel>

            {/* Top products */}
            <GlassPanel pad="md">
              <h2 className="font-display text-sm font-black mb-3">الأكثر مبيعاً</h2>
              <div className="space-y-2">
                {data.topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3 text-sm">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg gradient-primary text-[11px] font-black text-white">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {Number(p.sales_count ?? 0).toLocaleString("ar-EG")} مبيع
                    </span>
                    <Badge variant={(p.stock ?? 0) > 5 ? "success" : "sale"} className="shrink-0 text-[10px]">
                      {p.stock ?? 0} متوفر
                    </Badge>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>

          {/* Recent orders */}
          <GlassPanel pad="md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm font-black">أحدث الطلبات</h2>
              <Link to="/admin/orders" className="inline-flex items-center gap-1 text-xs text-primary-glow hover:underline">
                كل الطلبات <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
            {data.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                لا طلبات بعد — أول طلب سيصلك إشعار فوري في الجرس 🛒
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-wrap items-center gap-3 text-sm rounded-2xl bg-surface/50 border border-white/5 px-3 py-2"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                      #{o.id.slice(0, 8)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{o.customer_name ?? "عميل"}</span>
                    <span className="shrink-0 font-bold">{formatPrice(Number(o.total ?? 0))}</span>
                    <Badge
                      variant={
                        o.status === "delivered" ? "success" : o.status === "cancelled" ? "destructive" : "secondary"
                      }
                      className="shrink-0 text-[10px]"
                    >
                      {STATUS_LABEL[o.status] ?? o.status}
                    </Badge>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassPanel>
        </div>
      )}
    </AdminShell>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <GlassPanel pad="md" className={cn("flex items-center gap-3", highlight && "border-primary/40")}>
      <IconTile icon={icon} size="lg" tone={highlight ? "gradient" : "primarySoft"} />
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="font-display text-lg font-black truncate">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
      </div>
    </GlassPanel>
  );
}

function Attention({
  to,
  icon: Icon,
  label,
  count,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  count: number;
}) {
  const hot = count > 0;
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 rounded-2xl border p-3 transition",
        hot
          ? "border-sale/40 bg-sale/10 hover:bg-sale/15"
          : "border-white/5 bg-surface/40 opacity-70 hover:opacity-100",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", hot ? "text-sale" : "text-muted-foreground")} />
      <span className="min-w-0 flex-1 text-[11px] font-semibold leading-tight">{label}</span>
      <span className={cn("shrink-0 font-display text-lg font-black", hot ? "text-sale" : "text-muted-foreground")}>
        {count.toLocaleString("ar-EG")}
      </span>
    </Link>
  );
}

function SalesBars({ days }: { days: Array<{ label: string; total: number }> }) {
  const max = Math.max(...days.map((d) => d.total));
  if (max <= 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        لا مبيعات في آخر 14 يوماً — الرسم سيمتلئ مع أول طلباتك 📈
      </p>
    );
  }
  return (
    <div dir="ltr" className="flex items-end gap-1.5 h-32">
      {days.map((d, i) => {
        const h = Math.max(4, Math.round((d.total / max) * 100));
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div
              title={`${d.label}: ${formatPrice(d.total)}`}
              className={cn(
                "w-full rounded-t-md transition",
                d.total > 0 ? "gradient-primary shadow-glow-sm" : "bg-white/5",
              )}
              style={{ height: `${h}%` }}
            />
            <span className="text-[9px] text-muted-foreground">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
