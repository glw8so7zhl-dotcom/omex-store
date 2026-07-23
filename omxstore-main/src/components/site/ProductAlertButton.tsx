import { useNavigate } from "@tanstack/react-router";
import { BellPlus, BellRing, Check, Loader2, TrendingDown } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Kind = "restock" | "price_drop";

const COPY: Record<
  Kind,
  { idle: string; active: string; onToast: string; offToast: string }
> = {
  restock: {
    idle: "نبّهني عند التوفر",
    active: "سيصلك تنبيه عند التوفر",
    onToast: "سنُنبّهك فور عودة المنتج 🎉",
    offToast: "أُلغي تنبيه التوفر",
  },
  price_drop: {
    idle: "راقب انخفاض السعر",
    active: "مراقبة السعر مفعّلة",
    onToast: "سنُنبّهك عند انخفاض السعر 📉",
    offToast: "أُلغيت مراقبة السعر",
  },
};

/**
 * OMEX — one-tap product alerts (back-in-stock / price-drop).
 * Writes a row into `product_alerts` (RLS: own rows only); a database
 * trigger turns the admin's stock/price updates into real notifications
 * delivered to the user's bell. Guests are routed to sign-in.
 */
export function ProductAlertButton({
  productDbId,
  kind,
  size = "pill",
  className,
}: {
  productDbId: string;
  kind: Kind;
  size?: "pill" | "pillLg";
  className?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const queryKey = ["product-alert", productDbId, kind, user?.id ?? "guest"];

  const { data: alertId } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_alerts")
        .select("id")
        .eq("product_id", productDbId)
        .eq("kind", kind)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as { id: string } | null)?.id ?? null;
    },
  });

  const active = !!alertId;
  const copy = COPY[kind];

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) return "auth" as const;
      if (alertId) {
        const { error } = await supabase.from("product_alerts").delete().eq("id", alertId);
        if (error) throw error;
        return "removed" as const;
      }
      const { error } = await supabase
        .from("product_alerts")
        .insert({ user_id: user.id, product_id: productDbId, kind } as never);
      if (error) throw error;
      return "added" as const;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey });
      if (r === "added") toast.success(copy.onToast);
      if (r === "removed") toast.success(copy.offToast);
    },
    onError: () => toast.error("تعذّر حفظ التنبيه. حاول مجدداً."),
  });

  const onClick = () => {
    if (!user) {
      toast.info("سجّل الدخول ليصلك التنبيه");
      navigate({ to: "/auth" });
      return;
    }
    toggle.mutate();
  };

  const IdleIcon = kind === "restock" ? BellPlus : TrendingDown;
  const ActiveIcon = kind === "restock" ? BellRing : Check;

  return (
    <Button
      type="button"
      size={size}
      variant={active ? "glass" : kind === "restock" ? "gradient" : "glass"}
      aria-pressed={active}
      disabled={toggle.isPending}
      onClick={onClick}
      className={cn(active && "text-primary-glow", className)}
    >
      {toggle.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : active ? (
        <ActiveIcon className="h-4 w-4" />
      ) : (
        <IdleIcon className="h-4 w-4" />
      )}
      {active ? copy.active : copy.idle}
    </Button>
  );
}
