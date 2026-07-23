import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { ResourceManager, type Column, type Field } from "@/components/admin/ResourceManager";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  head: () => ({ meta: [{ title: "المخزون — OMEX Admin" }] }),
  component: InventoryAdmin,
});

type Inventory = {
  id: string;
  product_id: string;
  sku: string | null;
  stock: number;
  low_stock_threshold: number;
};

function InventoryAdmin() {
  const { data: prods } = useQuery({
    queryKey: ["admin-prod-options"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name").order("name");
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  const productMap = new Map((prods ?? []).map((p) => [p.id, p.name]));

  // Demand signal: customers subscribed to alerts per product (admin RLS read).
  const { data: alerts } = useQuery({
    queryKey: ["admin-product-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_alerts").select("product_id,kind");
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ product_id: string; kind: string }>;
    },
  });

  const restockWaiters = new Map<string, number>();
  const priceWatchers = new Map<string, number>();
  for (const a of alerts ?? []) {
    const m = a.kind === "restock" ? restockWaiters : priceWatchers;
    m.set(a.product_id, (m.get(a.product_id) ?? 0) + 1);
  }

  const columns: Column<Inventory>[] = [
    {
      key: "product",
      label: "المنتج",
      render: (r) => productMap.get(r.product_id) ?? r.product_id.slice(0, 8),
    },
    { key: "sku", label: "SKU", render: (r) => r.sku ?? "—" },
    {
      key: "stock",
      label: "المخزون",
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{r.stock}</span>
          {r.stock <= r.low_stock_threshold && (
            <Badge variant="destructive" className="text-[10px]">
              منخفض
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "waiting",
      label: "المنتظرون",
      render: (r) => {
        const waiting = restockWaiters.get(r.product_id) ?? 0;
        const watching = priceWatchers.get(r.product_id) ?? 0;
        if (!waiting && !watching) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="space-y-1">
            {waiting > 0 && (
              <Badge variant="sale" className="text-[10px] gap-1">
                <Bell className="h-3 w-3" />
                {waiting} بانتظار التوفر
              </Badge>
            )}
            {watching > 0 && (
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                {watching} يراقبون السعر
              </div>
            )}
          </div>
        );
      },
    },
    { key: "low_stock_threshold", label: "حد التنبيه" },
  ];

  const fields: Field[] = [
    {
      name: "product_id",
      label: "المنتج",
      type: "select",
      required: true,
      options: (prods ?? []).map((p) => ({ value: p.id, label: p.name })),
    },
    { name: "sku", label: "SKU" },
    { name: "stock", label: "المخزون", type: "number", required: true, defaultValue: 0 },
    {
      name: "low_stock_threshold",
      label: "حد التنبيه",
      type: "number",
      defaultValue: 5,
    },
  ];

  return (
    <AdminShell
      title="المخزون"
      subtitle="متابعة وتحديث الكميات — إعادة التوريد تُخطر العملاء المنتظرين تلقائياً"
    >
      <ResourceManager<Inventory>
        table="inventory"
        queryKey="admin-inventory"
        orderBy={{ column: "stock", ascending: true }}
        columns={columns}
        fields={fields}
        filter={(r, s) => (productMap.get(r.product_id) ?? "").toLowerCase().includes(s)}
        createLabel="سجل مخزون جديد"
      />
    </AdminShell>
  );
}
