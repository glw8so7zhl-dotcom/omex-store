import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleHelp, Loader2, MessageCircleQuestion, Send, Store } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchMyPendingQuestions,
  fetchPublishedQuestions,
  submitQuestion,
} from "@/lib/questions";
import { GlassPanel } from "@/components/site/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * OMEX — product page Q&A section.
 * Published answers build buyer confidence for everyone; signed-in
 * shoppers ask new questions and get a bell notification when answered.
 */
export function ProductQuestions({ productDbId }: { productDbId?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: published = [] } = useQuery({
    queryKey: ["product-questions", productDbId],
    enabled: !!productDbId,
    queryFn: () => fetchPublishedQuestions(productDbId as string),
  });

  const { data: mine = [] } = useQuery({
    queryKey: ["my-questions", productDbId, user?.id],
    enabled: !!productDbId && !!user,
    queryFn: () => fetchMyPendingQuestions(productDbId as string, user!.id),
  });

  const ask = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth");
      return submitQuestion(productDbId as string, user.id, text);
    },
    onSuccess: (r) => {
      if (r.ok) {
        setText("");
        qc.invalidateQueries({ queryKey: ["my-questions", productDbId, user?.id] });
        toast.success(r.message);
      } else {
        toast.error(r.message);
      }
    },
    onError: () => toast.error("تعذّر إرسال السؤال. حاول مجدداً."),
  });

  const submit = () => {
    if (!user) {
      toast.info("سجّل الدخول لطرح سؤالك — وسنُنبّهك فور الإجابة");
      navigate({ to: "/auth" });
      return;
    }
    if (text.trim().length < 5) {
      toast.error("اكتب سؤالاً أوضح (5 أحرف على الأقل)");
      return;
    }
    ask.mutate();
  };

  if (!productDbId) return null;

  return (
    <section className="mt-16">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircleQuestion className="h-6 w-6 text-primary-glow" />
        <h2 className="font-display text-2xl font-black">أسئلة وأجوبة</h2>
        {published.length > 0 && (
          <Badge variant="secondary" className="rounded-full">{published.length}</Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Q&A list */}
        <div className="space-y-3">
          {published.length === 0 && mine.length === 0 && (
            <GlassPanel pad="lg" className="text-center">
              <CircleHelp className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                لا توجد أسئلة بعد — كن أول من يسأل عن هذا المنتج.
              </p>
            </GlassPanel>
          )}

          {mine.map((q) => (
            <GlassPanel key={q.id} pad="md" className="space-y-2 border-dashed">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 text-sm font-bold">
                  <span className="text-primary-glow shrink-0">س:</span>
                  <span>{q.question}</span>
                </div>
                <Badge variant="sale" className="rounded-full shrink-0 text-[10px]">
                  بانتظار الإجابة
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                سنرسل لك تنبيهاً في الجرس فور إجابة المتجر 🔔
              </p>
            </GlassPanel>
          ))}

          {published.map((q) => (
            <GlassPanel key={q.id} pad="md" className="space-y-3">
              <div className="flex items-start gap-2 text-sm font-bold">
                <span className="text-primary-glow shrink-0">س:</span>
                <span>{q.question}</span>
              </div>
              <div className="flex items-start gap-2 rounded-2xl bg-primary/5 border border-primary/15 p-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg gradient-primary">
                  <Store className="h-3.5 w-3.5 text-white" />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-primary-glow mb-0.5">متجر OMEX</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{q.answer}</p>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>

        {/* Ask form */}
        <GlassPanel pad="md" className="h-fit space-y-3">
          <div className="font-bold text-sm">عندك سؤال عن المنتج؟</div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            اسأل عن المواصفات، الضمان، التوصيل… فريقنا يجيب وستصلك الإجابة في جرس التنبيهات.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="مثال: هل يدعم الجهاز شريحتين؟"
            className="w-full rounded-2xl bg-surface/70 border border-white/10 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary/50 outline-none resize-none"
          />
          <Button
            type="button"
            variant="gradient"
            size="pill"
            className="w-full"
            disabled={ask.isPending}
            onClick={submit}
          >
            {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {user ? "أرسل السؤال" : "سجّل الدخول واسأل"}
          </Button>
        </GlassPanel>
      </div>
    </section>
  );
}
