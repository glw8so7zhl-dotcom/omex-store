import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { resolvePublicSupabaseConfig } from "@/lib/supabase-config";

/**
 * Coupon validation — delegated to the `validate_coupon_v1` SECURITY DEFINER
 * function (same rules that `create_order_v1` re-applies authoritatively at
 * order time, so a preview can never be spoofed into a cheaper order).
 * No service-role key required.
 */
const validateInputSchema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().nonnegative(),
});

export type ValidateCouponInput = z.infer<typeof validateInputSchema>;

export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: ValidateCouponInput) => validateInputSchema.parse(data))
  .handler(async ({ data }): Promise<{ valid: boolean; discount: number; message: string }> => {
    const { url, key } = resolvePublicSupabaseConfig(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
    );
    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: result, error } = await supabase.rpc("validate_coupon_v1", {
      _code: data.code,
      _subtotal: data.subtotal,
    } as never);

    if (error || !result) {
      console.error("[validateCoupon] rpc failed", error);
      throw new Error("تعذّر التحقق من الكوبون. حاول لاحقاً.");
    }

    const r = result as unknown as { valid: boolean; discount: number | string; message: string };
    return { valid: !!r.valid, discount: Number(r.discount ?? 0), message: r.message };
  });
