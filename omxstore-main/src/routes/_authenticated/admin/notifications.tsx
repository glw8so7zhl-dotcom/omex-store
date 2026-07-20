import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Loader2, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { GlassPanel } from "@/components/site/GlassPanel";
import { EmptyState } from "@/components/site/EmptyState";
import { PageSpinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => ({ meta: [{ title: "التنبيهات — OMEX Admin" }] }),
  component: NotificationsAdmin,
});

function NotificationsAdmin() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: users } = useQuery({
    queryKey: ["admin-users-notify"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name")
        .order("created_at", { ascending: false });
      return (data ?? []) as Array<{ id: string; full_name: string | null }>;
    },
  });

  const { data: recent, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as Array<{
        id: string;
        title: string;
        body: string | null;
        created_at: string;
        user_id: string;
      }>;
    },
  });

  const broadcast = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("العنوان مطلوب");
      if (!users || users.length === 0) throw new Error("لا يوجد مستخدمون");
      const rows = users.map((u) => ({
        user_id: u.id,
        title: title.trim(),
        body: body.trim() || null,
      }));
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`تم إرسال التنبيه إلى ${users?.length ?? 0} مستخدم`);
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell title="التنبيهات" subtitle="بث تنبيهات لجميع المستخدمين">
      <GlassPanel pad="lg" className="space-y-3">
        <div className="space-y-1.5">
          <Label>العنوان</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عرض خاص لك"
          />
        </div>
        <div className="space-y-1.5">
          <Label>الرسالة</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="تفاصيل التنبيه…"
          />
        </div>
        <Button
          variant="gradient"
          onClick={() => broadcast.mutate()}
          disabled={broadcast.isPending || !title.trim()}
          className="w-full"
        >
          {broadcast.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4 ml-1" />
              إرسال إلى {users?.length ?? 0} مستخدم
            </>
          )}
        </Button>
      </GlassPanel>

      <div className="mt-4">
        <div className="text-xs text-muted-foreground mb-2">آخر التنبيهات المرسلة</div>
        {isLoading ? (
          <PageSpinner />
        ) : !recent || recent.length === 0 ? (
          <EmptyState icon={Bell} title="لا توجد تنبيهات بعد" />
        ) : (
          <GlassPanel pad="none" className="divide-y divide-white/5">
            {recent.map((n) => (
              <div key={n.id} className="px-4 py-3">
                <div className="flex justify-between gap-2">
                  <div className="font-semibold text-sm">{n.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("ar")}
                  </div>
                </div>
                {n.body && <div className="text-xs text-muted-foreground mt-1">{n.body}</div>}
              </div>
            ))}
          </GlassPanel>
        )}
      </div>
    </AdminShell>
  );
}
