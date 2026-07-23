import { z } from "zod";

export const YEMEN_GOVERNORATES = [
  "أمانة العاصمة",
  "صنعاء",
  "عدن",
  "تعز",
  "الحديدة",
  "إب",
  "ذمار",
  "حضرموت",
  "المكلا",
  "لحج",
  "أبين",
  "مأرب",
  "الضالع",
  "شبوة",
  "البيضاء",
  "حجة",
  "عمران",
  "المحويت",
  "ريمة",
  "صعدة",
  "الجوف",
  "المهرة",
  "سقطرى",
] as const;

export const PAYMENT_METHODS = ["cod", "bank_transfer"] as const;

export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1).max(999),
});

export const checkoutInputSchema = z.object({
  customerName: z.string().trim().min(2, "الاسم قصير جداً").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,20}$/u, "رقم الهاتف غير صالح"),
  governorate: z.enum(YEMEN_GOVERNORATES, { message: "اختر المحافظة" }),
  city: z.string().trim().min(2, "المدينة مطلوبة").max(120),
  address: z.string().trim().min(5, "العنوان قصير جداً").max(500),
  notes: z.string().trim().max(1000).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  couponCode: z.string().trim().max(40).optional(),
  redeemPoints: z.number().int().min(0).max(1000000).optional(),
  items: z.array(checkoutItemSchema).min(1, "السلة فارغة"),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
