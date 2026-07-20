import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { ResourceManager, type Column, type Field } from "@/components/admin/ResourceManager";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  head: () => ({ meta: [{ title: "الكوبونات — OMEX Admin" }] }),
  component: CouponsAdmin,
});

type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_subtotal: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

function CouponsAdmin() {
  const columns: Column<Coupon>[] = [
    { key: "code", label: "الكود", render: (r) => <span className="font-mono font-bold">{r.code}</span> },
    {
      key: "discount",
      label: "الخصم",
      render: (r) =>
        r.discount_type === "percent"
          ? `${r.discount_value}%`
          : `${Number(r.discount_value).toLocaleString()} ر.ي`,
    },
    {
      key: "usage",
      label: "الاستخدام",
      render: (r) => `${r.used_count} / ${r.max_uses ?? "∞"}`,
    },
    {
      key: "is_active",
      label: "الحالة",
      render: (r) => (
        <Badge variant={r.is_active ? "default" : "secondary"}>
          {r.is_active ? "مفعل" : "معطل"}
        </Badge>
      ),
    },
  ];

  const fields: Field[] = [
    { name: "code", label: "الكود", required: true, placeholder: "OMEX20" },
    {
      name: "discount_type",
      label: "نوع الخصم",
      type: "select",
      required: true,
      defaultValue: "percent",
      options: [
        { value: "percent", label: "نسبة مئوية" },
        { value: "fixed", label: "قيمة ثابتة" },
      ],
    },
    { name: "discount_value", label: "قيمة الخصم", type: "number", required: true, step: "0.01" },
    { name: "min_subtotal", label: "الحد الأدنى للطلب", type: "number", step: "0.01" },
    { name: "max_uses", label: "الحد الأقصى للاستخدام", type: "number" },
    { name: "starts_at", label: "يبدأ في", type: "date" },
    { name: "expires_at", label: "ينتهي في", type: "date" },
    { name: "is_active", label: "مفعل", type: "boolean", defaultValue: true },
  ];

  return (
    <AdminShell title="الكوبونات" subtitle="إنشاء وإدارة أكواد الخصم">
      <ResourceManager<Coupon>
        table="coupons"
        queryKey="admin-coupons"
        orderBy={{ column: "created_at", ascending: false }}
        columns={columns}
        fields={fields}
        searchColumn="code"
        createLabel="كوبون جديد"
      />
    </AdminShell>
  );
}
