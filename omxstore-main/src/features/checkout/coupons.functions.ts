import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * OMEX — coupon validation (server-authoritative preview).
 * Validates a code against the coupons table and returns the discount for a
 * given subtotal. The same rules are re-applied inside createOrder, so the
 * preview can never be spoofed into a cheaper order.
 */
const validateInputSchema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().nonnegative(),
});

export type ValidateCouponInput = z.infer<typeof validateInputSchema>;

export type CouponRow = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number | string;
  min_subtotal: number | string | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

export function computeCouponDiscount(coupon: CouponRow, subtotal: number): number {
  const value = Number(coupon.discount_value);
  return coupon.discount_type === "percent"
    ? Math.round((subtotal * value) / 100)
    : Math.min(subtotal, Math.round(value));
}

export function isCouponUsable(coupon: CouponRow, subtotal: number): boolean {
  const now = Date.now();
  return (
    coupon.is_active &&
    (!coupon.starts_at || new Date(coupon.starts_at).getTime() <= now) &&
    (!coupon.expires_at || new Date(coupon.expires_at).getTime() > now) &&
    (coupon.max_uses == null || coupon.used_count < coupon.max_uses) &&
    subtotal >= Number(coupon.min_subtotal ?? 0)
  );
}

export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: ValidateCouponInput) => validateInputSchema.parse(data))
  .handler(async ({ data }): Promise<{ valid: boolean; discount: number; message: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const code = data.code.trim().toUpperCase();
    const { data: coupon, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error("[validateCoupon] lookup failed", error);
      throw new Error("تعذّر التحقق من الكوبون. حاول لاحقاً.");
    }
    if (!coupon) return { valid: false, discount: 0, message: "كود الكوبون غير صحيح" };

    const row = coupon as unknown as CouponRow;
    if (!isCouponUsable(row, data.subtotal)) {
      const minSub = Number(row.min_subtotal ?? 0);
      if (row.is_active && data.subtotal < minSub) {
        return {
          valid: false,
          discount: 0,
          message: `هذا الكوبون يتطلب حداً أدنى للطلب`,
        };
      }
      return { valid: false, discount: 0, message: "انتهت صلاحية هذا الكوبون" };
    }

    return {
      valid: true,
      discount: computeCouponDiscount(row, data.subtotal),
      message: "تم تطبيق الكوبون بنجاح",
    };
  });
