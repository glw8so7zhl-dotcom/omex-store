import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * OMEX — guest order tracking.
 * Verification: full order UUID + the last 4 digits of the phone used on the
 * order. Runs server-side with the service-role client (RLS stays closed to
 * clients). Returns only non-sensitive fields — no address/phone/name echo.
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id,status,created_at,payment_method,subtotal,shipping,discount,total,phone")
      .eq("id", data.orderId)
      .maybeSingle();

    if (error) {
      console.error("[trackOrder] lookup failed", error);
      throw new Error("تعذّر البحث عن الطلب. حاول لاحقاً.");
    }

    // Verify ownership via the last 4 digits of the order's phone.
    const digits = String(order?.phone ?? "").replace(/\D/g, "");
    if (!order || !digits.endsWith(data.phoneLast4)) {
      return { found: false };
    }

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .select("product_name,qty,line_total")
      .eq("order_id", order.id);

    if (itemsErr) {
      console.error("[trackOrder] items lookup failed", itemsErr);
    }

    return {
      found: true,
      order: {
        id: order.id,
        status: order.status,
        created_at: order.created_at,
        payment_method: order.payment_method,
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        discount: Number(order.discount),
        total: Number(order.total),
        items: ((items ?? []) as Array<{ product_name: string; qty: number; line_total: number }>).map(
          (i) => ({ ...i, line_total: Number(i.line_total) }),
        ),
      },
    };
  });
