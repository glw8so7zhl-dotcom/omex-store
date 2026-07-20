import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { ResourceManager, type Column, type Field } from "@/components/admin/ResourceManager";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  head: () => ({ meta: [{ title: "البانرات — OMEX Admin" }] }),
  component: BannersAdmin,
});

type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link: string | null;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
};

function BannersAdmin() {
  const columns: Column<Banner>[] = [
    {
      key: "banner",
      label: "البانر",
      render: (r) => (
        <div className="flex items-center gap-2">
          <img src={r.image_url} alt="" className="h-10 w-16 rounded object-cover" />
          <div className="min-w-0">
            <div className="font-semibold truncate">{r.title ?? "—"}</div>
            <div className="text-[10px] text-muted-foreground truncate">{r.subtitle ?? ""}</div>
          </div>
        </div>
      ),
    },
    { key: "sort_order", label: "الترتيب" },
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
    { name: "title", label: "العنوان" },
    { name: "subtitle", label: "العنوان الفرعي" },
    { name: "image_url", label: "رابط الصورة", type: "url", required: true },
    { name: "link", label: "رابط عند الضغط", type: "url" },
    { name: "sort_order", label: "الترتيب", type: "number", defaultValue: 0 },
    { name: "starts_at", label: "يبدأ في", type: "date" },
    { name: "ends_at", label: "ينتهي في", type: "date" },
    { name: "is_active", label: "مفعل", type: "boolean", defaultValue: true },
  ];

  return (
    <AdminShell title="البانرات" subtitle="بانرات الصفحة الرئيسية">
      <ResourceManager<Banner>
        table="banners"
        queryKey="admin-banners"
        orderBy={{ column: "sort_order", ascending: true }}
        columns={columns}
        fields={fields}
        searchColumn="title"
        createLabel="بانر جديد"
      />
    </AdminShell>
  );
}
