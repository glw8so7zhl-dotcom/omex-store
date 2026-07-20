import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { ResourceManager, type Column, type Field } from "@/components/admin/ResourceManager";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "التصنيفات — OMEX Admin" }] }),
  component: CategoriesAdmin,
});

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  parent_id: string | null;
};

function CategoriesAdmin() {
  const columns: Column<Category>[] = [
    {
      key: "name",
      label: "التصنيف",
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="text-lg">{r.icon ?? "📦"}</span>
          <div>
            <div className="font-semibold">{r.name}</div>
            <div className="text-[10px] text-muted-foreground">{r.slug}</div>
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
    { name: "name", label: "الاسم", required: true },
    { name: "slug", label: "المعرّف", required: true },
    { name: "icon", label: "الأيقونة (Emoji)", placeholder: "📱" },
    { name: "sort_order", label: "الترتيب", type: "number", defaultValue: 0 },
    { name: "is_active", label: "مفعل", type: "boolean", defaultValue: true },
  ];

  return (
    <AdminShell title="التصنيفات" subtitle="تنظيم تصنيفات المتجر">
      <ResourceManager<Category>
        table="categories"
        queryKey="admin-categories"
        orderBy={{ column: "sort_order", ascending: true }}
        columns={columns}
        fields={fields}
        searchColumn="name"
        createLabel="تصنيف جديد"
      />
    </AdminShell>
  );
}
