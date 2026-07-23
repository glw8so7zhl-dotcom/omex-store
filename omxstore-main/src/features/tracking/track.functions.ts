import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { resolvePublicSupabaseConfig } from "@/lib/supabase-config";

/**
 * Guest order tracking — delegated to the `track_order_v1` SECURITY DEFINER
 * function. Verification: full order UUID + last 4 digits of the order's
 * phone. Returns only non-sensitive fields. No service-role key required.
 */
const trackInputSchema = z.object({
  orderId: z.string().trim().uuid("رقم الطلب غير صالح"),
  phoneLast4: z
    .string()
    .trim()
    .regex(/^[0-9]{4}$/u, "أدخل آخر 4 أرقام من رقم الهاتف"),
});

export type TrackInput = z.infer<typeof trackInputSchema>;

export type TrackedOrder = {
  id: string;
  status: string;
  created_at: string;
  payment_method: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  items: Array<{ product_name: string; qty: number; line_total: number }>;
};

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((data: TrackInput) => trackInputSchema.parse(data))
  .handler(async ({ data }): Promise<{ found: boolean; order?: TrackedOrder }> => {
    const { url, key } = resolvePublicSupabaseConfig(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
    );
    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: result, error } = await supabase.rpc("track_order_v1", {
      _order_id: data.orderId,
      _phone_last4: data.phoneLast4,
    } as never);

    if (error || !result) {
      console.error("[trackOrder] rpc failed", error);
      throw new Error("تعذّر البحث عن الطلب. حاول لاحقاً.");
    }

    const r = result as unknown as {
      found: boolean;
      order?: {
        id: string;
        status: string;
        created_at: string;
        payment_method: string;
        subtotal: number | string;
        shipping: number | string;
        discount: number | string;
        total: number | string;
        items: Array<{ product_name: string; qty: number; line_total: number | string }>;
      };
    };

    if (!r.found || !r.order) return { found: false };
    return {
      found: true,
      order: {
        id: r.order.id,
        status: r.order.status,
        created_at: r.order.created_at,
        payment_method: r.order.payment_method,
        subtotal: Number(r.order.subtotal),
        shipping: Number(r.order.shipping),
        discount: Number(r.order.discount),
        total: Number(r.order.total),
        items: (r.order.items ?? []).map((i) => ({
          product_name: i.product_name,
          qty: i.qty,
          line_total: Number(i.line_total),
        })),
      },
    };
  });
