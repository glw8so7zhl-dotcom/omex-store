import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { GlassPanel } from "@/components/site/GlassPanel";
import { PageSpinner } from "@/components/ui/spinner";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "الإحصائيات — OMEX Admin" }] }),
  component: AnalyticsAdmin,
});

function AnalyticsAdmin() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const thirtyAgo = new Date();
      thirtyAgo.setDate(thirtyAgo.getDate() - 30);
      const { data: orders } = await supabase
        .from("orders")
        .select("total,status,created_at,payment_method")
        .gte("created_at", thirtyAgo.toISOString());

      const days = new Map<string, { day: string; revenue: number; orders: number }>();
      const byStatus = new Map<string, number>();
      const byPayment = new Map<string, number>();

      (orders ?? []).forEach((o: { total: number | null; status: string; created_at: string; payment_method: string | null }) => {
        const day = o.created_at.slice(0, 10);
        const rev = Number(o.total ?? 0);
        const entry = days.get(day) ?? { day, revenue: 0, orders: 0 };
        entry.revenue += rev;
        entry.orders += 1;
        days.set(day, entry);
        byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
        byPayment.set(o.payment_method ?? "غير محدد", (byPayment.get(o.payment_method ?? "غير محدد") ?? 0) + 1);
      });

      return {
        daily: Array.from(days.values()).sort((a, b) => a.day.localeCompare(b.day)),
        status: Array.from(byStatus, ([name, value]) => ({ name, value })),
        payment: Array.from(byPayment, ([name, value]) => ({ name, value })),
      };
    },
  });

  return (
    <AdminShell title="الإحصائيات" subtitle="أداء آخر 30 يوم">
      {isLoading || !data ? (
        <PageSpinner />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassPanel pad="md">
            <div className="text-xs text-muted-foreground mb-3">الإيرادات اليومية</div>
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          <GlassPanel pad="md">
            <div className="text-xs text-muted-foreground mb-3">الطلبات اليومية</div>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          <GlassPanel pad="md">
            <div className="text-xs text-muted-foreground mb-3">الطلبات حسب الحالة</div>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={data.status}>
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          <GlassPanel pad="md">
            <div className="text-xs text-muted-foreground mb-3">طرق الدفع</div>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={data.payment}>
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>
        </div>
      )}
    </AdminShell>
  );
}
