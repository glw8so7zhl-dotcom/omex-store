import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, MessageCircle, PackageSearch } from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";

type FooterLink = { label: string; to: string };

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-surface/40 pb-24 md:pb-10">
      <div className="mx-auto max-w-7xl px-4 py-10 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl gradient-primary grid place-items-center font-display font-black text-white shadow-glow-sm">
              O
            </div>
            <div>
              <div className="font-display text-lg font-black">OMEX Store</div>
              <div className="text-xs text-muted-foreground">اختيارك الأفضل</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            متجر أومكس — تجربة تسوق مستقبلية بأفضل المنتجات الأصلية وتوصيل لجميع المحافظات
            اليمنية.
          </p>
          <Link
            to="/track"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl glass px-4 py-2 text-sm font-semibold hover:border-primary/40 transition"
          >
            <PackageSearch className="h-4 w-4 text-primary-glow" />
            تتبّع طلبك
          </Link>
        </div>

        <FooterCol
          title="الشركة"
          items={[
            { label: "من نحن", to: "/pages/about-us" },
            { label: "سياسة الخصوصية", to: "/pages/privacy-policy" },
            { label: "الشروط والأحكام", to: "/pages/terms" },
            { label: "العروض", to: "/offers" },
          ]}
        />
        <FooterCol
          title="الدعم"
          items={[
            { label: "الشحن والتوصيل", to: "/pages/shipping-policy" },
            { label: "سياسة الاسترجاع", to: "/pages/return-policy" },
            { label: "الأسئلة الشائعة", to: "/pages/faq" },
            { label: "تتبّع الطلب", to: "/track" },
          ]}
        />

        <div>
          <h4 className="font-display font-bold mb-3">تابعنا</h4>
          <div className="flex gap-2">
            <SocialBtn href={whatsappUrl("مرحبا")} label="واتساب">
              <MessageCircle className="h-4 w-4" />
            </SocialBtn>
            <SocialBtn href="https://facebook.com" label="فيسبوك">
              <Facebook className="h-4 w-4" />
            </SocialBtn>
            <SocialBtn href="https://instagram.com" label="انستقرام">
              <Instagram className="h-4 w-4" />
            </SocialBtn>
          </div>
          <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
            الدفع عند الاستلام متاح لجميع المحافظات · دعم واتساب على مدار الساعة.
          </p>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} OMEX Store — جميع الحقوق محفوظة
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: FooterLink[] }) {
  return (
    <div>
      <h4 className="font-display font-bold mb-3">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i.to}>
            <Link to={i.to} className="hover:text-primary-glow transition">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialBtn({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="h-10 w-10 rounded-2xl grid place-items-center bg-surface border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition"
    >
      {children}
    </a>
  );
}
