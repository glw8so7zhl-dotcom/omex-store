import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { GlassPanel } from "@/components/site/GlassPanel";
import { EmptyState } from "@/components/site/EmptyState";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  head: () => ({ meta: [{ title: "التقييمات — OMEX Admin" }] }),
  component: ReviewsAdmin,
});

type Review = {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_approved: boolean;
  created_at: string;
};

type Filter = "pending" | "approved" | "all";

function ReviewsAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data: reviews, error } = await supabase
        .from("reviews")
        .select("id,product_id,rating,title,body,is_approved,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (reviews ?? []) as unknown as Review[];

      const ids = Array.from(new Set(list.map((r) => r.product_id)));
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: prods } = await supabase.from("products").select("id,name").in("id", ids);
        for (const p of (prods ?? []) as Array<{ id: string; name: string }>) names.set(p.id, p.name);
      }
      return list.map((r) => ({ ...r, productName: names.get(r.product_id) ?? "—" }));
    },
  });

  const setApproved = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("reviews").update({ is_approved: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("تم تحديث حالة التقييم");
    },
    onError: (e: Error) => toast.error(e.message || "فشل التحديث"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("تم حذف التقييم");
    },
    onError: (e: Error) => toast.error(e.message || "فشل الحذف"),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "pending") return data.filter((r) => !r.is_approved);
    if (filter === "approved") return data.filter((r) => r.is_approved);
    return data;
  }, [data, filter]);

  const pendingCount = data?.filter((r) => !r.is_approved).length ?? 0;

  const tabs: Array<{ key: Filter; label: string }> = [
    { key: "pending", label: `بانتظار المراجعة${pendingCount ? ` (${pendingCount})` : ""}` },
    { key: "approved", label: "المعتمدة" },
    { key: "all", label: "الكل" },
  ];

  return (
    <AdminShell title="التقييمات" subtitle="اعتمد أو ارفض تقييمات العملاء قبل نشرها">
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-4">
          <GlassPanel pad="sm" className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <Button
                key={t.key}
                size="sm"
                variant={filter === t.key ? "gradient" : "glass"}
                onClick={() => setFilter(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </GlassPanel>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Star}
              title={filter === "pending" ? "لا توجد تقييمات بانتظار المراجعة" : "لا توجد تقييمات"}
              description="ستظهر تقييمات العملاء هنا للاعتماد."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <GlassPanel key={r.id} pad="md" className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              "h-4 w-4",
                              n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
                            )}
                          />
                        ))}
                      </span>
                      <Badge variant={r.is_approved ? "success" : "sale"}>
                        {r.is_approved ? "معتمد" : "بانتظار"}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                  <div className="text-xs text-primary-glow font-semibold">{r.productName}</div>
                  {r.title && <div className="font-bold text-sm">{r.title}</div>}
                  {r.body && <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>}
                  <div className="flex items-center gap-2 pt-1">
                    {r.is_approved ? (
                      <Button
                        size="sm"
                        variant="glass"
                        onClick={() => setApproved.mutate({ id: r.id, value: false })}
                        disabled={setApproved.isPending}
                      >
                        <X className="h-4 w-4" /> إلغاء الاعتماد
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => setApproved.mutate({ id: r.id, value: true })}
                        disabled={setApproved.isPending}
                      >
                        <Check className="h-4 w-4" /> اعتماد
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="glass"
                      className="text-red-400"
                      onClick={() => remove.mutate(r.id)}
                      disabled={remove.isPending}
                    >
                      {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      حذف
                    </Button>
                  </div>
                </GlassPanel>
              ))}
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
