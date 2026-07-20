import type { Product } from "./products";
import { formatPrice } from "./products";

// Configurable via VITE_WHATSAPP_NUMBER build-time env; falls back to demo number.
export const WHATSAPP_NUMBER =
  (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? "967700000000";

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
