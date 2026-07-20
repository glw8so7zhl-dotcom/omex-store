import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { GlassPanel } from "@/components/site/GlassPanel";
import { EmptyState } from "@/components/site/EmptyState";
import { PageSpinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [{ title: "الطلبات — OMEX Admin" }] }),
  component: OrdersAdmin,
});

const STATUSES = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "confirmed", label: "مؤكد" },
  { value: "processing", label: "قيد التجهيز" },
  { value: "shipped", label: "تم الشحن" },
  { value: "delivered", label: "تم التوصيل" },
  { value: "cancelled", label: "ملغى" },
];

type Order = {
  id: string;
  customer_name: string | null;
  phone: string | null;
  total: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  city: string | null;
  address: string | null;
  notes: string | null;
  shipping: number | null;
  discount: number | null;
};

function OrdersAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewId, setViewId] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("تم تحديث الحالة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!orders) return [];
    const s = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!s) return true;
      return (
        (o.customer_name ?? "").toLowerCase().includes(s) ||
        (o.phone ?? "").includes(s)
      );
    });
  }, [orders, q, statusFilter]);

  return (
    <AdminShell title="الطلبات" subtitle="إدارة ومتابعة الطلبات">
      {isLoading ? (
        <PageSpinner />
      ) : (
        <>
          <GlassPanel pad="sm" className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="بحث برقم أو اسم أو هاتف…"
                className="pr-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </GlassPanel>

          {filtered.length === 0 ? (
            <EmptyState icon={Inbox} title="لا توجد طلبات" />
          ) : (
            <GlassPanel pad="none" className="overflow-hidden mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/5 bg-white/[0.02]">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-semibold">الرقم</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">العميل</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">المبلغ</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">الحالة</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">التاريخ</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((o) => (
                      <tr key={o.id} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-3 font-mono text-xs">
                          {o.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{o.customer_name ?? "—"}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {o.phone ?? ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatPrice(Number(o.total))}</td>
                        <td className="px-4 py-3">
                          <Select
                            value={o.status}
                            onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("ar")}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="glass"
                            size="icon"
                            onClick={() => setViewId(o.id)}
                            aria-label="عرض"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          )}
        </>
      )}

      <OrderDetailDialog id={viewId} onClose={() => setViewId(null)} />
    </AdminShell>
  );
}

function OrderDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["admin-order", id],
    enabled: !!id,
    queryFn: async () => {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id!).single(),
        supabase.from("order_items").select("*").eq("order_id", id!),
      ]);
      if (orderRes.error) throw orderRes.error;
      return { order: orderRes.data, items: itemsRes.data ?? [] };
    },
  });

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تفاصيل الطلب</DialogTitle>
        </DialogHeader>
        {!data ? (
          <PageSpinner />
        ) : (
          <div className="space-y-3 text-sm">
            <Row label="رقم الطلب" value={data.order.id.slice(0, 8)} />
            <Row label="العميل" value={data.order.customer_name} />
            <Row label="الهاتف" value={data.order.phone} />
            <Row label="المدينة" value={data.order.city} />
            <Row label="العنوان" value={data.order.address} />
            <Row label="الملاحظات" value={data.order.notes} />
            <Row label="طريقة الدفع" value={data.order.payment_method} />
            <Row
              label="الحالة"
              value={<Badge>{STATUSES.find((s) => s.value === data.order.status)?.label ?? data.order.status}</Badge>}
            />
            <div className="border-t border-white/10 pt-3">
              <div className="text-xs text-muted-foreground mb-2">المنتجات</div>
              <div className="space-y-1">
                {data.items.map((i: { id: string; product_name: string; qty: number; unit_price: number }) => (
                  <div key={i.id} className="flex justify-between text-xs">
                    <span>
                      {i.product_name} × {i.qty}
                    </span>
                    <span>{formatPrice(Number(i.unit_price) * i.qty)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-white/10 pt-3 space-y-1">
              <Row label="الشحن" value={formatPrice(Number(data.order.shipping ?? 0))} />
              <Row label="الخصم" value={formatPrice(Number(data.order.discount ?? 0))} />
              <Row label="الإجمالي" value={<strong>{formatPrice(Number(data.order.total))}</strong>} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-xs text-left">{value}</span>
    </div>
  );
}
