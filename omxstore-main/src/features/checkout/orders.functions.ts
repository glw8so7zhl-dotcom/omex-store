import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { resolvePublicSupabaseConfig } from "@/lib/supabase-config";
import { checkoutInputSchema, type CheckoutInput } from "./schema";

/**
 * Order creation — delegated to the trusted `create_order_v1` SECURITY
 * DEFINER function inside Postgres. All pricing/coupon rules run in the
 * database (never trusting the client), and NO service-role key is needed.
 * The caller's bearer token (attached by the global auth middleware) is
 * forwarded so auth.uid() inside the RPC attributes the order to the
 * signed-in user; guests stay anonymous.
 */
function getForwardedBearer(): string | null {
  try {
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice("Bearer ".length).trim();
    return token.split(".").length === 3 ? token : null;
  } catch {
    return null;
  }
}

type RpcOrderResult = {
  order_id: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  items: Array<{
    product_id: string;
    product_name: string;
    unit_price: number;
    qty: number;
    line_total: number;
  }>;
};

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: CheckoutInput) => checkoutInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { url, key } = resolvePublicSupabaseConfig(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
    );

    const token = getForwardedBearer();
    const supabase = createClient<Database>(url, key, {
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: result, error } = await supabase.rpc("create_order_v1", {
      _customer_name: data.customerName,
      _phone: data.phone,
      _governorate: data.governorate,
      _city: data.city,
      _address: data.address,
      _notes: data.notes ?? null,
      _payment_method: data.paymentMethod,
      _items: data.items.map((i) => ({ product_id: i.productId, qty: i.qty })),
      _coupon_code: data.couponCode?.trim() || null,
    } as never);

    if (error || !result) {
      console.error("[createOrder] rpc failed", error);
      const msg = String(error?.message ?? "");
      if (msg.includes("unknown_product")) {
        throw new Error("أحد المنتجات لم يعد متوفراً. حدّث السلة وحاول مجدداً.");
      }
      throw new Error("تعذّر إنشاء الطلب. حاول مرة أخرى.");
    }

    const order = result as unknown as RpcOrderResult;
    return {
      orderId: order.order_id,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      discount: Number(order.discount),
      total: Number(order.total),
      items: (order.items ?? []).map((i) => ({
        name: i.product_name,
        qty: i.qty,
        lineTotal: Number(i.line_total),
      })),
    };
  });
