import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { ResourceManager, type Column, type Field } from "@/components/admin/ResourceManager";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "الإعدادات — OMEX Admin" }] }),
  component: SettingsAdmin,
});

type Setting = {
  id: string;
  key: string;
  value: unknown;
  is_public: boolean;
};

function SettingsAdmin() {
  const columns: Column<Setting>[] = [
    { key: "key", label: "المفتاح", render: (r) => <span className="font-mono">{r.key}</span> },
    {
      key: "value",
      label: "القيمة",
      render: (r) => (
        <code className="text-[10px] text-muted-foreground line-clamp-2">
          {JSON.stringify(r.value)}
        </code>
      ),
    },
    {
      key: "is_public",
      label: "عام",
      render: (r) => (
        <Badge variant={r.is_public ? "default" : "secondary"}>
          {r.is_public ? "عام" : "خاص"}
        </Badge>
      ),
    },
  ];

  const fields: Field[] = [
    { name: "key", label: "المفتاح", required: true, placeholder: "store_name" },
    {
      name: "value",
      label: "القيمة (JSON)",
      type: "textarea",
      required: true,
      placeholder: '"OMEX Store" أو {"key":"value"}',
      helper: "أدخل قيمة JSON صحيحة (نص بين علامتي اقتباس، رقم، أو كائن).",
    },
    { name: "is_public", label: "عام (يمكن قراءته من العميل)", type: "boolean" },
  ];

  return (
    <AdminShell title="الإعدادات" subtitle="متغيرات المتجر العامة">
      <ResourceManager<Setting>
        table="settings"
        queryKey="admin-settings"
        orderBy={{ column: "key", ascending: true }}
        columns={columns}
        fields={fields}
        searchColumn="key"
        createLabel="إعداد جديد"
        transformIn={(r) => ({ ...r, value: JSON.stringify(r.value) })}
        transformOut={(v) => {
          const raw = v.value;
          let parsed: unknown = raw;
          if (typeof raw === "string") {
            try {
              parsed = JSON.parse(raw);
            } catch {
              parsed = raw;
            }
          }
          return { ...v, value: parsed };
        }}
      />
    </AdminShell>
  );
}
