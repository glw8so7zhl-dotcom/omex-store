import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Floating back-to-top button — appears after meaningful scroll. */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="العودة إلى الأعلى"
      onClick={() =>
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" })
      }
      className={cn(
        "fixed bottom-24 md:bottom-6 right-4 z-40 h-11 w-11 grid place-items-center rounded-2xl glass-strong shadow-card transition-all duration-300",
        visible
          ? "opacity-100 translate-y-0"
          : "pointer-events-none opacity-0 translate-y-3",
      )}
    >
      <ArrowUp className="h-5 w-5 text-primary-glow" />
    </button>
  );
}
