import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, ShieldCheck, ShieldOff, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { GlassPanel } from "@/components/site/GlassPanel";
import { EmptyState } from "@/components/site/EmptyState";
import { PageSpinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({ meta: [{ title: "المدراء والأدوار — OMEX Admin" }] }),
  component: RolesAdmin,
});

const ROLES = ["admin", "moderator", "customer"] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABEL: Record<Role, string> = {
  admin: "مدير",
  moderator: "مشرف",
  customer: "عميل",
};

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [
    "إدارة المنتجات والتصنيفات",
    "إدارة الطلبات والمخزون",
    "إدارة الكوبونات والبانرات",
    "بث التنبيهات",
    "منح وسحب الأدوار",
    "تعديل الإعدادات",
  ],
  moderator: ["مراجعة التقييمات", "متابعة الطلبات (قراءة)"],
  customer: ["الشراء وإدارة الحساب الشخصي"],
};

function RolesAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-roles-users"],
    queryFn: async () => {
      const [profRes, roleRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,phone,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const rolesByUser = new Map<string, Role[]>();
      ((roleRes.data ?? []) as Array<{ user_id: string; role: Role }>).forEach((r) => {
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push(r.role);
        rolesByUser.set(r.user_id, list);
      });
      return (profRes.data ?? []).map((p: { id: string; full_name: string | null; phone: string | null }) => ({
        ...p,
        roles: rolesByUser.get(p.id) ?? [],
      }));
    },
  });

  const toggleRole = useMutation({
    mutationFn: async ({ userId, role, on }: { userId: string; role: Role; on: boolean }) => {
      if (on) {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role })
          .single();
        if (error && !String(error.message).includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-roles-users"] });
      toast.success("تم التحديث");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!profiles) return [];
    const s = q.trim().toLowerCase();
    if (!s) return profiles;
    return profiles.filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(s) ||
        (p.phone ?? "").includes(s),
    );
  }, [profiles, q]);

  return (
    <AdminShell title="المدراء والأدوار" subtitle="إدارة صلاحيات المستخدمين">
      <GlassPanel pad="md" className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="h-4 w-4 text-primary" />
          <div className="font-display font-black">الصلاحيات</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ROLES.map((role) => (
            <div key={role} className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
              <Badge>{ROLE_LABEL[role]}</Badge>
              <ul className="mt-2 text-xs text-muted-foreground space-y-1 list-disc list-inside">
                {ROLE_PERMISSIONS[role].map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel pad="sm" className="mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف…"
            className="pr-9"
          />
        </div>
      </GlassPanel>

      {isLoading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="لا يوجد مستخدمون" />
      ) : (
        <GlassPanel pad="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5 bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold">المستخدم</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">الأدوار الحالية</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">تعديل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{p.full_name ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{p.phone ?? ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">بدون</span>
                        ) : (
                          p.roles.map((r) => <Badge key={r}>{ROLE_LABEL[r]}</Badge>)
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ROLES.map((r) => {
                          const has = p.roles.includes(r);
                          return (
                            <Button
                              key={r}
                              size="sm"
                              variant={has ? "gradient" : "glass"}
                              onClick={() =>
                                toggleRole.mutate({ userId: p.id, role: r, on: !has })
                              }
                              disabled={toggleRole.isPending}
                            >
                              {has ? (
                                <ShieldOff className="h-3 w-3 ml-1" />
                              ) : (
                                <ShieldCheck className="h-3 w-3 ml-1" />
                              )}
                              {ROLE_LABEL[r]}
                            </Button>
                          );
                        })}
                        {toggleRole.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}
    </AdminShell>
  );
}
