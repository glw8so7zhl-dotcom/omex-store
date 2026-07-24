import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { submitReview } from "@/lib/reviews";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * OMEX — one-tap post-purchase rating, shown under each item of a
 * DELIVERED order. Tap the stars, optionally add a line, submit — the
 * review lands in the admin approval queue and then powers the homepage
 * testimonials. Already-reviewed items show their submitted state.
 */
export function RateOrderItem({
  productDbId,
  userId,
  existing,
}: {
  productDbId: string;
  userId: string;
  existing?: { rating: number; approved: boolean };
}) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");

  const submit = useMutation({
    mutationFn: () => submitReview({ productDbId, userId, rating, body: body.trim() || undefined }),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success("شكراً لتقييمك! سيُنشر بعد مراجعته 🌟");
        qc.invalidateQueries({ queryKey: ["my-reviews"] });
      } else {
        toast.error(r.message);
      }
    },
    onError: () => toast.error("تعذّر إرسال التقييم. حاول مجدداً."),
  });

  if (existing) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "h-3.5 w-3.5",
                n <= existing.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
              )}
            />
          ))}
        </span>
        <span>{existing.approved ? "تقييمك منشور — شكراً لك" : "تقييمك قيد المراجعة"}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">قيّم المنتج:</span>
        <span className="inline-flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} من 5 نجوم`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              className="p-0.5"
            >
              <Star
                className={cn(
                  "h-4 w-4 transition",
                  n <= (hover || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40 hover:text-amber-400/60",
                )}
              />
            </button>
          ))}
        </span>
      </div>

      {rating > 0 && (
        <div className="flex items-center gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            placeholder="أخبرنا برأيك (اختياري)…"
            className="flex-1 h-9 rounded-xl bg-surface/70 border border-white/10 px-3 text-xs placeholder:text-muted-foreground focus:border-primary/50 outline-none"
          />
          <Button
            type="button"
            size="sm"
            variant="gradient"
            disabled={submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            إرسال
          </Button>
        </div>
      )}
    </div>
  );
}
