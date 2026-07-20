import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { Footer } from "@/components/site/Footer";
import { SummaryRow } from "@/components/site/SummaryRow";
import { Container } from "@/components/site/Container";
import { PageHeader } from "@/components/site/PageHeader";
import { GlassPanel } from "@/components/site/GlassPanel";
import { IconTile } from "@/components/site/IconTile";
import { EmptyState } from "@/components/site/EmptyState";
import {
  TextField,
  TextArea,
  SelectField,
} from "@/components/site/TextField";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createOrder } from "@/features/checkout/orders.functions";
import {
  YEMEN_GOVERNORATES,
  checkoutInputSchema,
  type CheckoutInput,
} from "@/features/checkout/schema";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "إتمام الطلب — OMEX Store" },
      { name: "description", content: "أدخل بيانات التوصيل واختر طريقة الدفع لإتمام طلبك." },
    ],
  }),
  component: CheckoutPage,
});

type FormState = Omit<CheckoutInput, "items">;

const initialForm: FormState = {
  customerName: "",
  phone: "",
  governorate: YEMEN_GOVERNORATES[0],
  city: "",
  address: "",
  notes: "",
  paymentMethod: "cod",
  couponCode: "",
};

function CheckoutPage() {
  const { items, total } = useCart();
  const navigate = useNavigate();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const shipping = total > 0 ? 3000 : 0;
  const discount = useMemo(
    () => (form.couponCode?.trim().toUpperCase() === "OMEX10" ? Math.round(total * 0.1) : 0),
    [form.couponCode, total],
  );
  const grand = Math.max(0, total - discount + shipping);

  const createOrderFn = useServerFn(createOrder);
  const mutation = useMutation({
    mutationFn: createOrderFn,
    onSuccess: async (result) => {
      toast.success("تم إنشاء الطلب بنجاح");
      await navigate({ to: "/checkout/success/$id", params: { id: result.orderId } });
      router.invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "حدث خطأ. حاول مرة أخرى.");
    },
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("السلة فارغة");
      return;
    }
    const payload: CheckoutInput = {
      ...form,
      notes: form.notes?.trim() || undefined,
      couponCode: form.couponCode?.trim() || undefined,
      items: items.map((i) => ({ productId: i.product.id, qty: i.qty })),
    };
    const parsed = checkoutInputSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("راجع البيانات المدخلة");
      return;
    }
    mutation.mutate({ data: parsed.data });
  };

  if (items.length === 0) {
    return (
      <main className="pb-8">
        <Container size="md" className="py-16">
          <EmptyState
            panel={false}
            icon={ShoppingBag}
            title="لا يمكن إتمام طلب فارغ"
            description="أضف منتجات إلى السلة أولاً."
            action={
              <Button asChild variant="gradient" size="pill">
                <Link to="/">
                  تسوّق الآن
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            }
          />
        </Container>
        <Footer />
      </main>
    );
  }

  return (
    <main className="pb-8">
      <Container size="lg" className="py-6">
        <PageHeader
          title="إتمام الطلب"
          subtitle="أدخل بيانات التوصيل واختر طريقة الدفع المفضّلة."
        />

        <form
          onSubmit={submit}
          className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]"
          noValidate
        >
          <div className="space-y-6">
            {/* Shipping */}
            <GlassPanel tone="strong" pad="lg" className="space-y-4">
              <SectionTitle icon={MapPin} title="بيانات التوصيل" />

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="الاسم الكامل"
                  value={form.customerName}
                  onChange={(e) => update("customerName", e.target.value)}
                  error={errors.customerName}
                  autoComplete="name"
                  required
                />
                <TextField
                  label="رقم الهاتف"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  error={errors.phone}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
                <SelectField
                  label="المحافظة"
                  value={form.governorate}
                  onChange={(e) =>
                    update("governorate", e.target.value as (typeof YEMEN_GOVERNORATES)[number])
                  }
                  error={errors.governorate}
                  required
                >
                  {YEMEN_GOVERNORATES.map((g) => (
                    <option key={g} value={g} className="bg-surface">
                      {g}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label="المدينة / الحي"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  error={errors.city}
                  autoComplete="address-level2"
                  required
                />
                <TextField
                  className="sm:col-span-2"
                  label="العنوان التفصيلي"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  error={errors.address}
                  autoComplete="street-address"
                  required
                />
                <TextArea
                  className="sm:col-span-2"
                  label="ملاحظات (اختياري)"
                  value={form.notes ?? ""}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="أي تفاصيل إضافية عن الطلب..."
                />
              </div>
            </GlassPanel>

            {/* Payment */}
            <GlassPanel tone="strong" pad="lg" className="space-y-4">
              <SectionTitle icon={CreditCard} title="طريقة الدفع" />

              <div className="grid gap-3 sm:grid-cols-2">
                <PaymentOption
                  selected={form.paymentMethod === "cod"}
                  onSelect={() => update("paymentMethod", "cod")}
                  icon={Truck}
                  title="الدفع عند الاستلام"
                  subtitle="ادفع نقداً عند وصول الطلب"
                />
                <PaymentOption
                  selected={form.paymentMethod === "bank_transfer"}
                  onSelect={() => update("paymentMethod", "bank_transfer")}
                  icon={Banknote}
                  title="تحويل بنكي"
                  subtitle="سنرسل تفاصيل الحساب عبر واتساب"
                />
              </div>

              {form.paymentMethod === "bank_transfer" && (
                <div className="rounded-2xl bg-primary/10 border border-primary/30 p-4 text-xs leading-relaxed text-muted-foreground">
                  بعد إرسال الطلب سنتواصل معك عبر واتساب لإرسال تفاصيل الحساب البنكي.
                  يتم تأكيد الطلب فور استلام التحويل.
                </div>
              )}
            </GlassPanel>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <GlassPanel tone="strong" pad="lg" className="space-y-4">
              <h2 className="font-display text-lg font-black">ملخص الطلب</h2>

              <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {items.map((i) => (
                  <li
                    key={i.product.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate text-muted-foreground">
                      {i.product.name} × {i.qty}
                    </span>
                    <span className="font-semibold shrink-0">
                      {formatPrice(i.product.price * i.qty)}
                    </span>
                  </li>
                ))}
              </ul>

              <input
                value={form.couponCode ?? ""}
                onChange={(e) => update("couponCode", e.target.value)}
                placeholder="كود الخصم (OMEX10)"
                aria-label="كود الخصم"
                className="w-full h-11 rounded-2xl bg-surface/70 border border-white/10 px-3 text-sm placeholder:text-muted-foreground focus:border-primary/50 outline-none"
              />

              <div className="space-y-2 text-sm border-t border-white/10 pt-3">
                <SummaryRow label="المجموع الفرعي" value={formatPrice(total)} />
                {discount > 0 && (
                  <SummaryRow
                    label="الخصم"
                    value={`- ${formatPrice(discount)}`}
                    accent="text-success"
                  />
                )}
                <SummaryRow label="الشحن" value={formatPrice(shipping)} />
                <div className="border-t border-white/10 pt-3">
                  <SummaryRow label="الإجمالي" value={formatPrice(grand)} bold />
                </div>
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending}
                variant="gradientGlow"
                size="pillLg"
                className="w-full"
              >
                {mutation.isPending ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    تأكيد الطلب
                    <ArrowLeft className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground text-center justify-center">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                طلبك مؤمّن ومحفوظ في نظامنا
              </p>
            </GlassPanel>
          </aside>
        </form>
      </Container>
      <Footer />
    </main>
  );
}

function SectionTitle({ icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <IconTile icon={icon} size="lg" tone="gradient" />
      <h2 className="font-display text-lg font-black">{title}</h2>
    </div>
  );
}

function PaymentOption({
  selected,
  onSelect,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "text-right rounded-2xl border p-4 flex items-center gap-3 transition",
        selected
          ? "border-primary/60 bg-primary/10 shadow-glow-sm"
          : "border-white/10 bg-surface/70 hover:border-primary/40",
      )}
    >
      <IconTile
        icon={icon}
        size="md"
        tone={selected ? "gradient" : "primarySoft"}
      />
      <div className="min-w-0">
        <div className="text-sm font-bold truncate">{title}</div>
        <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
      </div>
    </button>
  );
}
