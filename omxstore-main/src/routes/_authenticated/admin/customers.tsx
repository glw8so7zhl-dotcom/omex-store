import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { ResourceManager, type Column, type Field } from "@/components/admin/ResourceManager";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => ({ meta: [{ title: "العملاء — OMEX Admin" }] }),
  component: CustomersAdmin,
});

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
};

function CustomersAdmin() {
  const columns: Column<Profile>[] = [
    { key: "full_name", label: "الاسم", render: (r) => r.full_name ?? "—" },
    { key: "phone", label: "الهاتف", render: (r) => r.phone ?? "—" },
    {
      key: "created_at",
      label: "التسجيل",
      render: (r) => new Date(r.created_at).toLocaleDateString("ar"),
    },
  ];

  const fields: Field[] = [
    { name: "full_name", label: "الاسم" },
    { name: "phone", label: "الهاتف" },
    { name: "avatar_url", label: "رابط الصورة", type: "url" },
  ];

  return (
    <AdminShell title="العملاء" subtitle="قائمة المستخدمين المسجّلين">
      <ResourceManager<Profile>
        table="profiles"
        queryKey="admin-profiles"
        orderBy={{ column: "created_at", ascending: false }}
        columns={columns}
        fields={fields}
        canCreate={false}
        canDelete={false}
        searchColumn="full_name"
      />
    </AdminShell>
  );
}
