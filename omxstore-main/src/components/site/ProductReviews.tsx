import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { fetchProductReviews, submitReview } from "@/lib/reviews";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/site/GlassPanel";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)} aria-label={`${value} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn("h-4 w-4", n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
        />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-label={`${n} نجوم`} onClick={() => onChange(n)}>
          <Star
            className={cn(
              "h-6 w-6 transition",
              n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-amber-400/70",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ productDbId }: { productDbId?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const enabled = !!productDbId;
  const { data, isLoading } = useQuery({
    queryKey: ["reviews", productDbId],
    enabled,
    queryFn: () => fetchProductReviews(productDbId!),
  });

  const mutation = useMutation({
    mutationFn: () =>
      submitReview({ productDbId: productDbId!, userId: user!.id, rating, title, body }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(res.message);
        setTitle("");
        setBody("");
        qc.invalidateQueries({ queryKey: ["reviews", productDbId] });
      } else {
        toast.error(res.message);
      }
    },
    onError: () => toast.error("تعذّر إرسال التقييم."),
  });

  if (!enabled) return null;

  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-black">التقييمات</h2>
        {data && data.count > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Stars value={data.average} />
            <span className="font-bold">{data.average}</span>
            <span className="text-muted-foreground">({data.count})</span>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* list */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-8 grid place-items-center">
              <Spinner />
            </div>
          ) : data && data.list.length > 0 ? (
            data.list.map((r, i) => (
              <GlassPanel key={i} pad="md" shadow={false} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Stars value={r.rating} />
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("ar-EG")}
                  </span>
                </div>
                {r.title && <div className="font-bold text-sm">{r.title}</div>}
                {r.body && <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>}
              </GlassPanel>
            ))
          ) : (
            <GlassPanel pad="lg" className="text-center text-sm text-muted-foreground">
              لا توجد تقييمات بعد — كن أول من يقيّم هذا المنتج.
            </GlassPanel>
          )}
        </div>

        {/* submit */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <GlassPanel tone="strong" pad="lg" className="space-y-3">
            <h3 className="font-display text-lg font-black">أضف تقييمك</h3>
            {user ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate();
                }}
              >
                <StarPicker value={rating} onChange={setRating} />
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="عنوان مختصر (اختياري)"
                  className="w-full h-11 rounded-2xl bg-surface/70 border border-white/10 px-3.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="شارك تجربتك مع هذا المنتج..."
                  className="w-full rounded-2xl bg-surface/70 border border-white/10 px-3.5 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
                <Button type="submit" variant="gradient" size="pill" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending ? <Spinner size="sm" className="text-white" /> : "إرسال التقييم"}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  يظهر تقييمك بعد مراجعته من الإدارة.
                </p>
              </form>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">سجّل الدخول لإضافة تقييمك.</p>
                <Button asChild variant="gradient" size="pill" className="w-full">
                  <Link to="/auth">تسجيل الدخول</Link>
                </Button>
              </div>
            )}
          </GlassPanel>
        </aside>
      </div>
    </section>
  );
}
