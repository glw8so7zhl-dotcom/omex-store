import type { Product } from "./products";
import { formatPrice } from "./products";

/**
 * Official OMEX store WhatsApp number (Yemen, international format for wa.me).
 * Local number 775878805 → 967775878805.
 */
const DEFAULT_WHATSAPP_NUMBER = "967775878805";

/**
 * Normalize any env-provided value ("+967 77 587 8805", "775878805", …)
 * into wa.me digits. Falls back to the official store number when the env
 * is missing or unusable — same resilience approach as supabase-config.
 */
function cleanWhatsappNumber(raw: string | undefined): string | null {
  if (!raw) return null;
  // Digits only, and no international-dialing leading zeros (0096777… → 96777…).
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 9) return null;
  if (digits.startsWith("967")) return digits;
  if (digits.length === 9 && digits.startsWith("7")) return `967${digits}`;
  return digits;
}

// Optional override via VITE_WHATSAPP_NUMBER build-time env.
export const WHATSAPP_NUMBER =
  cleanWhatsappNumber(import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ??
  DEFAULT_WHATSAPP_NUMBER;

export function whatsappUrl(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function whatsappProductUrl(p: Product) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/products/${p.id}` : "";
  const msg = [
    "السلام عليكم، أريد طلب هذا المنتج:",
    "",
    `اسم المنتج: ${p.name}`,
    `السعر: ${formatPrice(p.price)}`,
    url ? `رابط المنتج: ${url}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return whatsappUrl(msg);
}

export type WhatsappOrderLine = { name: string; qty: number; lineTotal: number };
export type WhatsappOrderPayload = {
  orderId: string;
  customerName: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  notes?: string | null;
  paymentMethod: "cod" | "bank_transfer";
  items: WhatsappOrderLine[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
};

const PAYMENT_LABEL: Record<WhatsappOrderPayload["paymentMethod"], string> = {
  cod: "الدفع عند الاستلام",
  bank_transfer: "تحويل بنكي",
};

export function whatsappOrderUrl(order: WhatsappOrderPayload) {
  const lines = order.items.map(
    (i, idx) => `${idx + 1}) ${i.name} × ${i.qty} — ${formatPrice(i.lineTotal)}`,
  );
  const msg = [
    "السلام عليكم، أريد تأكيد هذا الطلب:",
    "",
    `رقم الطلب: ${order.orderId}`,
    "",
    "المنتجات:",
    ...lines,
    "",
    `المجموع الفرعي: ${formatPrice(order.subtotal)}`,
    order.discount > 0 ? `الخصم: - ${formatPrice(order.discount)}` : "",
    `الشحن: ${formatPrice(order.shipping)}`,
    `الإجمالي: ${formatPrice(order.total)}`,
    "",
    "بيانات التوصيل:",
    `الاسم: ${order.customerName}`,
    `الهاتف: ${order.phone}`,
    `المحافظة: ${order.governorate} — ${order.city}`,
    `العنوان: ${order.address}`,
    order.notes ? `ملاحظات: ${order.notes}` : "",
    "",
    `طريقة الدفع: ${PAYMENT_LABEL[order.paymentMethod]}`,
  ]
    .filter(Boolean)
    .join("\n");
  return whatsappUrl(msg);
}
