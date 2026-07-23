import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  BadgeCheck,
  FileText,
  HelpCircle,
  RefreshCcw,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/site/Container";
import { PageHeader } from "@/components/site/PageHeader";
import { GlassPanel } from "@/components/site/GlassPanel";
import { IconTile } from "@/components/site/IconTile";
import { Footer } from "@/components/site/Footer";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp";

type Block = { heading?: string; paragraphs?: string[]; bullets?: string[] };
type PageDef = { title: string; description: string; icon: LucideIcon; blocks: Block[] };

const PAGES: Record<string, PageDef> = {
  "about-us": {
    title: "من نحن",
    description: "قصة متجر OMEX ورسالتنا في اليمن.",
    icon: BadgeCheck,
    blocks: [
      {
        paragraphs: [
          "متجر OMEX هو وجهة التسوق الإلكتروني الأولى للمنتجات الأصلية في اليمن. بدأنا برؤية بسيطة: تجربة تسوق عصرية وآمنة تصل إلى كل المحافظات اليمنية، بمنتجات مضمونة وأسعار عادلة.",
          "نختار منتجاتنا بعناية — إلكترونيات، أجهزة ذكية، أدوات منزلية، رياضة والمزيد — ونوصلها إلى باب بيتك مع خيار الدفع عند الاستلام، لأن ثقتك أغلى ما نملك.",
        ],
      },
      {
        heading: "لماذا OMEX؟",
        bullets: [
          "منتجات أصلية 100% مع ضمان.",
          "توصيل سريع لجميع المحافظات اليمنية.",
          "الدفع عند الاستلام أو التحويل البنكي.",
          "دعم مباشر عبر واتساب على مدار الساعة.",
        ],
      },
    ],
  },
  faq: {
    title: "الأسئلة الشائعة",
    description: "إجابات على أكثر الأسئلة تكراراً في متجر OMEX.",
    icon: HelpCircle,
    blocks: [
      {
        heading: "كيف أطلب من المتجر؟",
        paragraphs: [
          "أضف المنتجات إلى السلة ثم أكمل بيانات التوصيل في صفحة إتمام الطلب. ستصلك رسالة تأكيد ويمكنك تأكيد الطلب عبر واتساب.",
        ],
      },
      {
        heading: "هل الدفع عند الاستلام متاح؟",
        paragraphs: ["نعم — الدفع عند الاستلام متاح لجميع المحافظات اليمنية، كما نوفر خيار التحويل البنكي."],
      },
      {
        heading: "كم تستغرق مدة التوصيل؟",
        paragraphs: ["من 2 إلى 5 أيام عمل حسب المحافظة. داخل المدن الرئيسية غالباً أسرع."],
      },
      {
        heading: "كيف أتتبّع طلبي؟",
        paragraphs: [
          "من صفحة \"تتبّع طلبك\" أدخل رقم الطلب (من صفحة التأكيد) وآخر 4 أرقام من هاتفك لعرض حالة الطلب لحظة بلحظة.",
        ],
      },
      {
        heading: "هل يمكنني إرجاع المنتج؟",
        paragraphs: ["نعم خلال 3 أيام من الاستلام إذا كان المنتج بحالته الأصلية — راجع سياسة الاسترجاع."],
      },
    ],
  },
  "privacy-policy": {
    title: "سياسة الخصوصية",
    description: "كيف نتعامل مع بياناتك في متجر OMEX.",
    icon: ShieldCheck,
    blocks: [
      {
        heading: "البيانات التي نجمعها",
        bullets: [
          "بيانات الطلب: الاسم، رقم الهاتف، العنوان — لغرض توصيل طلبك فقط.",
          "بيانات الحساب (اختياري): البريد الإلكتروني عند إنشاء حساب.",
        ],
      },
      {
        heading: "كيف نستخدمها",
        bullets: [
          "تنفيذ الطلبات والتواصل بشأنها عبر الهاتف أو واتساب.",
          "تحسين تجربة التسوق وعرض المنتجات المناسبة.",
          "لا نبيع بياناتك ولا نشاركها مع أي طرف ثالث لأغراض تسويقية.",
        ],
      },
      {
        heading: "حماية البيانات",
        paragraphs: [
          "تُخزَّن بياناتك على بنية سحابية آمنة مع تشفير أثناء النقل، ولا يصل إليها إلا فريق المتجر المخوّل. يمكنك طلب حذف حسابك وبياناتك في أي وقت عبر التواصل معنا.",
        ],
      },
    ],
  },
  "return-policy": {
    title: "سياسة الاسترجاع",
    description: "شروط استبدال واسترجاع المنتجات.",
    icon: RefreshCcw,
    blocks: [
      {
        heading: "متى يمكنك الإرجاع؟",
        bullets: [
          "خلال 3 أيام من استلام الطلب.",
          "إذا وصل المنتج تالفاً أو مختلفاً عن الوصف — الإرجاع مجاني بالكامل.",
          "يجب أن يكون المنتج بحالته الأصلية مع الغلاف والملحقات.",
        ],
      },
      {
        heading: "كيف تطلب الإرجاع؟",
        paragraphs: [
          "تواصل معنا عبر واتساب مع رقم الطلب وصورة للمنتج، وسيقوم فريقنا بترتيب الاستلام والاستبدال أو إعادة المبلغ.",
        ],
      },
      {
        heading: "استثناءات",
        bullets: ["منتجات العناية الشخصية المفتوحة.", "المنتجات المخصصة بطلب خاص."],
      },
    ],
  },
  "shipping-policy": {
    title: "الشحن والتوصيل",
    description: "مناطق التغطية ومدة ورسوم التوصيل.",
    icon: Truck,
    blocks: [
      {
        heading: "التغطية",
        paragraphs: ["نوصل إلى جميع المحافظات اليمنية عبر شركاء شحن موثوقين."],
      },
      {
        heading: "المدة المتوقعة",
        bullets: [
          "المدن الرئيسية (صنعاء، عدن، تعز، الحديدة): 2 – 3 أيام عمل.",
          "بقية المحافظات: 3 – 5 أيام عمل.",
        ],
      },
      {
        heading: "الرسوم",
        paragraphs: [
          "رسوم توصيل موحّدة تظهر بوضوح في ملخص الطلب قبل التأكيد — لا رسوم خفية.",
        ],
      },
    ],
  },
  terms: {
    title: "الشروط والأحكام",
    description: "شروط استخدام متجر OMEX.",
    icon: FileText,
    blocks: [
      {
        heading: "الطلبات والأسعار",
        bullets: [
          "الأسعار المعروضة بالريال اليمني وتشمل قيمة المنتج فقط، وتُضاف رسوم الشحن في ملخص الطلب.",
          "تُحسب قيمة الطلب النهائية من نظام المتجر لحظة التأكيد.",
          "يحق للمتجر إلغاء أي طلب يشتبه في كونه غير جاد بعد محاولة التواصل.",
        ],
      },
      {
        heading: "الحساب والاستخدام",
        bullets: [
          "أنت مسؤول عن سرية بيانات حسابك.",
          "يُمنع استخدام المتجر بأي شكل يخالف القوانين المعمول بها.",
        ],
      },
      {
        heading: "التواصل",
        paragraphs: ["لأي استفسار حول هذه الشروط تواصل معنا عبر واتساب — نسعد بخدمتك."],
      },
    ],
  },
};

export const Route = createFileRoute("/pages/$slug")({
  loader: ({ params }) => {
    const page = PAGES[params.slug];
    if (!page) throw notFound();
    return { slug: params.slug };
  },
  head: ({ params }) => {
    const page = PAGES[params.slug as string];
    return {
      meta: page
        ? [
            { title: `${page.title} — OMEX Store` },
            { name: "description", content: page.description },
          ]
        : [{ title: "الصفحة غير موجودة" }],
    };
  },
  component: StaticPage,
});

function StaticPage() {
  const { slug } = Route.useLoaderData();
  const page = PAGES[slug];

  return (
    <main className="pb-8">
      <Container size="md" className="py-6">
        <div className="flex items-center gap-3">
          <IconTile icon={page.icon} size="lg" tone="gradient" />
          <PageHeader title={page.title} subtitle={page.description} />
        </div>

        <div className="mt-6 space-y-4">
          {page.blocks.map((b, i) => (
            <GlassPanel key={i} pad="lg" className="space-y-3">
              {b.heading && <h2 className="font-display text-lg font-black">{b.heading}</h2>}
              {b.paragraphs?.map((p, j) => (
                <p key={j} className="text-sm text-muted-foreground leading-relaxed">
                  {p}
                </p>
              ))}
              {b.bullets && (
                <ul className="space-y-1.5 text-sm">
                  {b.bullets.map((li, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-glow shrink-0" />
                      <span className="text-muted-foreground">{li}</span>
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>
          ))}

          <GlassPanel tone="strong" pad="lg" className="text-center">
            <p className="text-sm text-muted-foreground">
              لديك سؤال آخر؟ تواصل معنا مباشرة عبر واتساب:
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-bold text-success hover:underline"
              dir="ltr"
            >
              +{WHATSAPP_NUMBER}
            </a>
          </GlassPanel>
        </div>
      </Container>
      <Footer />
    </main>
  );
}
