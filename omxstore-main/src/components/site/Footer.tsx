import { Facebook, Instagram, MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";

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
        </div>

        <FooterCol title="الشركة" items={["من نحن", "سياسة الخصوصية", "الشروط والأحكام"]} />
        <FooterCol title="الدعم" items={["الشحن والتوصيل", "الاسترجاع", "تواصل معنا"]} />

        <div>
          <h4 className="font-display font-bold mb-3">تابعنا</h4>
          <div className="flex gap-2">
            <SocialBtn href={whatsappUrl("مرحبا")} label="واتساب">
              <MessageCircle className="h-4 w-4" />
            </SocialBtn>
            <SocialBtn href="#" label="فيسبوك">
              <Facebook className="h-4 w-4" />
            </SocialBtn>
            <SocialBtn href="#" label="انستقرام">
              <Instagram className="h-4 w-4" />
            </SocialBtn>
          </div>
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

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-display font-bold mb-3">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i}>
            <a href="#" className="hover:text-primary-glow transition">
              {i}
            </a>
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
