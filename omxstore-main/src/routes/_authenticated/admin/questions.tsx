import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Loader2, MessageCircleQuestion, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { GlassPanel } from "@/components/site/GlassPanel";
import { EmptyState } from "@/components/site/EmptyState";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/questions")({
  head: () => ({ meta: [{ title: "الأسئلة — OMEX Admin" }] }),
  component: QuestionsAdmin,
});

type Question = {
  id: string;
  product_id: string;
  question: string;
  answer: string | null;
  is_published: boolean;
  created_at: string;
  productName?: string;
};

type Filter = "pending" | "answered" | "all";

function QuestionsAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-questions"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("product_questions")
        .select("id,product_id,question,answer,is_published,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (rows ?? []) as unknown as Question[];
      const ids = Array.from(new Set(list.map((r) => r.product_id)));
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: prods } = await supabase.from("products").select("id,name").in("id", ids);
        for (const p of (prods ?? []) as Array<{ id: string; name: string }>) names.set(p.id, p.name);
      }
      return list.map((r) => ({ ...r, productName: names.get(r.product_id) ?? "—" }));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-questions"] });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "pending") return data.filter((r) => !r.answer);
    if (filter === "answered") return data.filter((r) => !!r.answer);
    return data;
  }, [data, filter]);

  const pendingCount = data?.filter((r) => !r.answer).length ?? 0;

  const tabs: Array<{ key: Filter; label: string }> = [
    { key: "pending", label: `بانتظار الإجابة${pendingCount ? ` (${pendingCount})` : ""}` },
    { key: "answered", label: "المُجابة" },
    { key: "all", label: "الكل" },
  ];

  return (
    <AdminShell title="الأسئلة" subtitle="أجب على أسئلة العملاء — يصلهم تنبيه فوري بإجابتك">
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
              icon={MessageCircleQuestion}
              title={filter === "pending" ? "لا توجد أسئلة بانتظار الإجابة" : "لا توجد أسئلة"}
              description="أسئلة العملاء على المنتجات ستظهر هنا."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((q) => (
                <QuestionItem key={q.id} q={q} onChanged={invalidate} />
              ))}
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}

function QuestionItem({ q, onChanged }: { q: Question; onChanged: () => void }) {
  const [answer, setAnswer] = useState(q.answer ?? "");

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      const clean = answer.trim();
      if (clean.length < 2) throw new Error("اكتب إجابة أولاً");
      const { error } = await supabase
        .from("product_questions")
        .update({ answer: clean, is_published: publish } as never)
        .eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onChanged();
      toast.success("حُفظت الإجابة وأُرسل التنبيه للسائل");
    },
    onError: (e: Error) => toast.error(e.message || "فشل الحفظ"),
  });

  const togglePublish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("product_questions")
        .update({ is_published: !q.is_published } as never)
        .eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onChanged();
      toast.success(q.is_published ? "أُخفي السؤال" : "نُشر السؤال");
    },
    onError: () => toast.error("فشل التحديث"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_questions").delete().eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onChanged();
      toast.success("حُذف السؤال");
    },
    onError: () => toast.error("فشل الحذف"),
  });

  return (
    <GlassPanel pad="md" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-primary-glow font-semibold">{q.productName}</div>
        <div className="flex items-center gap-2">
          <Badge variant={q.answer ? "success" : "sale"}>
            {q.answer ? "مُجاب" : "بانتظار"}
          </Badge>
          {q.answer && (
            <Badge variant={q.is_published ? "default" : "secondary"}>
              {q.is_published ? "منشور" : "مخفي"}
            </Badge>
          )}
          <span className="text-[11px] text-muted-foreground">
            {new Date(q.created_at).toLocaleDateString("ar-EG")}
          </span>
        </div>
      </div>

      <div className="text-sm font-bold">س: {q.question}</div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="اكتب إجابة المتجر هنا…"
        className="w-full rounded-2xl bg-surface/70 border border-white/10 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary/50 outline-none resize-none"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="success"
          disabled={save.isPending}
          onClick={() => save.mutate(true)}
        >
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {q.answer ? "تحديث ونشر" : "إجابة ونشر"}
        </Button>
        {q.answer && (
          <Button
            size="sm"
            variant="glass"
            disabled={togglePublish.isPending}
            onClick={() => togglePublish.mutate()}
          >
            {q.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {q.is_published ? "إخفاء" : "نشر"}
          </Button>
        )}
        <Button
          size="sm"
          variant="glass"
          className="text-red-400"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          <Trash2 className="h-4 w-4" />
          حذف
        </Button>
      </div>
    </GlassPanel>
  );
}
