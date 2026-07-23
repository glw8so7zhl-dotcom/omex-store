import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkoutInputSchema, type CheckoutInput } from "./schema";

const SHIPPING_FLAT = 3000;
const COUPON_10 = "OMEX10";

/**
 * Optional auth: if the request carries a valid Supabase bearer token
 * (attached by the global `attachSupabaseAuth` client middleware), return the
 * user id so the order is linked to the account. Guests → null. Never throws;
 * any problem degrades gracefully to a guest order.
 */
async function getOptionalUserId(url: string, key: string): Promise<string | null> {
  try {
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice("Bearer ".length).trim();
    if (token.split(".").length !== 3) return null;

    const authClient = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return String(data.claims.sub);
  } catch {
    return null;
  }
}

// Sanitize env values (strip whitespace + wrapping quotes pasted into
// dashboard env editors) — prevents "Invalid supabaseUrl" at runtime.
const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']+|["']+$/g, "").trim();

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: CheckoutInput) => checkoutInputSchema.parse(data))
  .handler(async ({ data }) => {
    const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
    const SUPABASE_PUBLISHABLE_KEY = cleanEnv(process.env.SUPABASE_PUBLISHABLE_KEY);
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("تعذّر الاتصال بالخادم. حاول لاحقاً.");
    }

    // Orders are created by the trusted server ONLY, via the service-role
    // client (bypasses RLS). Client-side INSERT on orders/order_items is
    // disabled by RLS — this closes the price/total-tampering hole while
    // still allowing guest checkout. Requires SUPABASE_SERVICE_ROLE_KEY.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Build the trusted product map from the DATABASE — never trust client
    // prices, and never fall back to stale static data.
    const requestedSlugs = Array.from(new Set(data.items.map((i) => i.productId)));
    const { data: productRows, error: productErr } = await supabaseAdmin
      .from("products")
      .select("slug,name,price,is_active")
      .in("slug", requestedSlugs);

    if (productErr) {
      console.error("[createOrder] product lookup failed", productErr);
      throw new Error("تعذّر التحقق من المنتجات. حاول مرة أخرى.");
    }

    const productMap = new Map(
      ((productRows ?? []) as Array<{
        slug: string;
        name: string;
        price: number | string;
        is_active: boolean;
      }>).map((p) => [p.slug, p]),
    );

    const items = data.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product || !product.is_active) {
        throw new Error(`المنتج غير متوفر: ${item.productId}`);
      }
      const unitPrice = Number(product.price);
      const qty = item.qty;
      return {
        product_id: product.slug,
        product_name: product.name,
        unit_price: unitPrice,
        qty,
        line_total: unitPrice * qty,
      };
    });

    const subtotal = items.reduce((s, i) => s + i.line_total, 0);
    const shipping = subtotal > 0 ? SHIPPING_FLAT : 0;
    const discount =
      data.couponCode?.trim().toUpperCase() === COUPON_10 ? Math.round(subtotal * 0.1) : 0;
    const total = Math.max(0, subtotal - discount + shipping);

    // Link the order to the signed-in user when possible (guest checkout still allowed).
    const userId = await getOptionalUserId(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: data.customerName,
        phone: data.phone,
        governorate: data.governorate,
        city: data.city,
        address: data.address,
        notes: data.notes ?? null,
        payment_method: data.paymentMethod,
        subtotal,
        shipping,
        discount,
        total,
      })
      .select("id")
      .single();

    if (orderErr || !orderRow) {
      console.error("[createOrder] insert order failed", orderErr);
      throw new Error("تعذّر إنشاء الطلب. حاول مرة أخرى.");
    }

    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(items.map((i) => ({ ...i, order_id: orderRow.id })));

    if (itemsErr) {
      console.error("[createOrder] insert items failed", itemsErr);
      // Best-effort cleanup of the orphan order.
      await supabaseAdmin.from("orders").delete().eq("id", orderRow.id);
      throw new Error("تعذّر حفظ منتجات الطلب. حاول مرة أخرى.");
    }

    return {
      orderId: orderRow.id,
      subtotal,
      shipping,
      discount,
      total,
      items: items.map((i) => ({
        name: i.product_name,
        qty: i.qty,
        lineTotal: i.line_total,
      })),
    };
  });
