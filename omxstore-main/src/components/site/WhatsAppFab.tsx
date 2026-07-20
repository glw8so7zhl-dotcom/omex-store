import { MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";

export function WhatsAppFab() {
  return (
    <a
      href={whatsappUrl("السلام عليكم، أريد الاستفسار عن منتجاتكم.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل عبر واتساب"
      className="fixed bottom-24 md:bottom-6 left-4 z-50 group"
    >
      <span className="absolute inset-0 rounded-full bg-success/60 blur-xl animate-pulse-glow" />
      <span className="relative grid place-items-center h-14 w-14 rounded-full bg-success shadow-glow-sm ring-4 ring-success/20 group-hover:scale-110 transition">
        <MessageCircle className="h-6 w-6 text-white" />
      </span>
    </a>
  );
}
