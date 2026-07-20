import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { GlassPanel } from "@/components/site/GlassPanel";
import { IconTile } from "@/components/site/IconTile";
import { PageSpinner } from "@/components/ui/spinner";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "لوحة التحكم — OMEX Admin" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [products, orders, customers, revenueRes, pending, lowStock] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total").eq("status", "delivered"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("inventory").select("id", { count: "exact", head: true }).lte("stock", 5),
      ]);
      const revenue = (revenueRes.data ?? []).reduce(
        (s: number, r: { total: number | null }) => s + Number(r.total ?? 0),
        0,
      );
      return {
        products: products.count ?? 0,
        orders: orders.count ?? 0,
        customers: customers.count ?? 0,
        revenue,
        pending: pending.count ?? 0,
        lowStock: lowStock.count ?? 0,
      };
    },
  });

  return (
    <AdminShell title="لوحة التحكم" subtitle="نظرة عامة على أداء المتجر">
      {isLoading || !data ? (
        <PageSpinner />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Stat icon={DollarSign} label="الإيرادات" value={formatPrice(data.revenue)} />
          <Stat icon={ShoppingBag} label="الطلبات" value={data.orders.toLocaleString()} />
          <Stat icon={Package} label="المنتجات" value={data.products.toLocaleString()} />
          <Stat icon={Users} label="العملاء" value={data.customers.toLocaleString()} />
          <Stat icon={TrendingUp} label="طلبات معلّقة" value={data.pending.toLocaleString()} />
          <Stat icon={AlertCircle} label="مخزون منخفض" value={data.lowStock.toLocaleString()} />
        </div>
      )}
    </AdminShell>
  );
}

function Stat({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <GlassPanel pad="md" className="flex items-center gap-3">
      <IconTile icon={icon} size="lg" tone="gradient" />
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="font-display text-lg font-black truncate">{value}</div>
      </div>
    </GlassPanel>
  );
}
