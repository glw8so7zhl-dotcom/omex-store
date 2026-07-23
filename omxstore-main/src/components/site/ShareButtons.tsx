import { Facebook, Link2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { whatsappUrl } from "@/lib/whatsapp";

/** Share the current product via WhatsApp / Facebook / X / copy link. */
export function ShareButtons({ title }: { title: string }) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = `${title} — OMEX Store`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.error("تعذّر نسخ الرابط");
    }
  };

  const btn =
    "h-9 w-9 grid place-items-center rounded-xl bg-surface/70 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">مشاركة:</span>
      <a
        className={btn}
        aria-label="مشاركة عبر واتساب"
        href={whatsappUrl(`${text}\n${url}`)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle className="h-4 w-4 text-success" />
      </a>
      <a
        className={btn}
        aria-label="مشاركة على فيسبوك"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Facebook className="h-4 w-4" />
      </a>
      <a
        className={btn}
        aria-label="مشاركة على X"
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="text-sm font-black">𝕏</span>
      </a>
      <button className={btn} aria-label="نسخ الرابط" onClick={copy} type="button">
        <Link2 className="h-4 w-4" />
      </button>
    </div>
  );
}
