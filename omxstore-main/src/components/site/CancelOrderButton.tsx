import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const CANCELLABLE = new Set(["pending", "confirmed"]);

const REASON_MSG: Record<string, string> = {
  not_found: "لم يتم العثور على الطلب.",
  not_allowed: "لا تملك صلاحية إلغاء هذا الطلب.",
  already_cancelled: "هذا الطلب ملغى مسبقاً.",
  not_cancellable: "تجاوز الطلب مرحلة الإلغاء — تواصل معنا عبر واتساب وسنساعدك.",
};

/**
 * OMEX — self-service order cancellation (before processing/shipping).
 * Two-step inline confirm → cancel_order_v1 RPC. Signed-in owners pass
 * automatically; guests (track page) verify with the phone's last-4.
 * The database triggers then restore stock, refund redeemed points and
 * notify everyone concerned.
 */
export function CancelOrderButton({
  orderId,
  status,
  phoneLast4,
  onCancelled,
}: {
  orderId: string;
  status: string;
  phoneLast4?: string;
  onCancelled?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const cancel = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("cancel_order_v1", {
        _order_id: orderId,
        _phone_last4: phoneLast4 ?? null,
      } as never);
      if (error) throw error;
      return data as unknown as { ok: boolean; reason?: string };
    },
    onSuccess: (r) => {
      setConfirming(false);
      if (r.ok) {
        toast.success("أُلغي الطلب وأعيدت الكمية للمخزون ✓");
        onCancelled?.();
      } else {
        toast.error(REASON_MSG[r.reason ?? ""] ?? "تعذّر إلغاء الطلب.");
      }
    },
    onError: () => {
      setConfirming(false);
      toast.error("تعذّر إلغاء الطلب. حاول مجدداً.");
    },
  });

  if (!CANCELLABLE.has(status)) return null;

  if (confirming) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-sale/40 bg-sale/10 px-3 py-2">
        <span className="text-xs font-semibold text-sale">تأكيد إلغاء الطلب؟</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            {cancel.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "نعم، ألغِ"}
          </Button>
          <Button type="button" size="sm" variant="glass" onClick={() => setConfirming(false)}>
            تراجع
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-sale transition"
    >
      <XCircle className="h-3.5 w-3.5" />
      إلغاء الطلب (متاح قبل التجهيز)
    </button>
  );
}
