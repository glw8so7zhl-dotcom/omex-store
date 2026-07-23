import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "omex_pwa_dismissed";

/**
 * OMEX — PWA bootstrap + install pill.
 * Registers the conservative service worker, then, when the browser fires
 * `beforeinstallprompt` (Android/Chrome), shows a dismissible bottom pill:
 * "ثبّت تطبيق OMEX". Hidden when already installed (standalone) or after
 * the user dismisses it.
 */
export function PwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Service worker: static-assets cache only (see public/sw.js).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone || localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible || !deferred) return null;

  const install = async () => {
    setVisible(false);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("تم تثبيت تطبيق OMEX 🎉");
      }
    } catch {
      /* prompt can only be used once; ignore */
    }
    setDeferred(null);
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-strong flex items-center gap-2 rounded-2xl border border-white/10 py-2 ps-2 pe-3 shadow-card">
        <button
          onClick={install}
          className="inline-flex items-center gap-2 rounded-xl gradient-primary px-3 py-2 text-xs font-bold text-white shadow-glow-sm hover:brightness-110 transition"
        >
          <Download className="h-4 w-4" />
          ثبّت تطبيق OMEX
        </button>
        <span className="hidden sm:block text-[11px] text-muted-foreground">
          أسرع، وبأيقونة على شاشتك
        </span>
        <button aria-label="إغلاق" onClick={dismiss} className="text-muted-foreground hover:text-foreground transition">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
