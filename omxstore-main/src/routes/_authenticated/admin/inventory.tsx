import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
    <AdminShell title="المخزون" subtitle="متابعة وتحديث كميات المنتجات">
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
