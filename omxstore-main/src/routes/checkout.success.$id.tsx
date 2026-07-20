import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Home, MessageCircle, Package } from "lucide-react";
import { useCart } from "@/lib/cart";
import { fadeUp, staggerParent } from "@/lib/motion";
import { Footer } from "@/components/site/Footer";
import { Container } from "@/components/site/Container";
import { GlassPanel } from "@/components/site/GlassPanel";
import { IconTile } from "@/components/site/IconTile";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/success/$id")({
  head: () => ({
    meta: [
      { title: "تم إرسال الطلب — OMEX Store" },
      { name: "description", content: "تم استلام طلبك بنجاح، وسنتواصل معك قريباً." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { id } = Route.useParams();
  const { clear } = useCart();
  const reduce = useReducedMotion();

  useEffect(() => {
    clear();
  }, [clear]);

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `السلام عليكم، أريد تأكيد طلبي رقم: ${id}`,
  )}`;

  const iconVariant = {
    hidden: { opacity: 0, scale: 0.5 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 320, damping: 18 } },
  } as const;

  return (
    <main className="pb-8">
      <Container size="sm" className="py-14 text-center">
        <motion.div
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={reduce ? undefined : staggerParent}
        >
          <motion.div
            variants={reduce ? undefined : iconVariant}
            className="relative mx-auto h-20 w-20"
          >
            <span className="absolute inset-0 rounded-3xl bg-primary/40 blur-2xl animate-pulse-glow" />
            <span className="relative grid h-20 w-20 place-items-center rounded-3xl gradient-primary shadow-glow">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </span>
          </motion.div>

          <motion.h1
            variants={reduce ? undefined : fadeUp}
            className="mt-7 font-display text-2xl md:text-3xl font-black"
          >
            تم استلام طلبك بنجاح
          </motion.h1>
          <motion.p
            variants={reduce ? undefined : fadeUp}
            className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed"
          >
            سنتواصل معك قريباً لتأكيد التفاصيل. يمكنك حفظ رقم الطلب أدناه للرجوع إليه.
          </motion.p>

          <motion.div variants={reduce ? undefined : fadeUp}>
            <GlassPanel tone="strong" pad="lg" className="mt-6 text-right space-y-3">
              <div className="flex items-center gap-3">
                <IconTile icon={Package} size="md" tone="primarySoft" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">رقم الطلب</div>
                  <div className="font-mono text-sm font-bold break-all">{id}</div>
                </div>
              </div>
            </GlassPanel>
          </motion.div>

          <motion.div
            variants={reduce ? undefined : fadeUp}
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <Button asChild variant="success" size="pillLg">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                تأكيد عبر واتساب
              </a>
            </Button>
            <Button asChild variant="glass" size="pillLg">
              <Link to="/">
                <Home className="h-4 w-4" />
                العودة للرئيسية
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </Container>
      <Footer />
    </main>
  );
}
