import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { PromoBanner } from "@/lib/banners";
import { cn } from "@/lib/utils";

/**
 * OMEX — homepage promo banners strip.
 * Fully admin-driven from /admin/banners: campaigns go live on the
 * storefront the moment they're saved (no deploy). Broken/indirect image
 * URLs degrade gracefully to the gradient design; banners without a link
 * render as static cards.
 */
export function PromoBanners({ items }: { items: PromoBanner[] }) {
  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-4">
      <div
        className={cn(
          "grid gap-4",
          items.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2",
        )}
      >
        {items.slice(0, 4).map((b) => (
          <BannerCard key={b.id} banner={b} />
        ))}
      </div>
    </section>
  );
}

function BannerCard({ banner }: { banner: PromoBanner }) {
  const [imgOk, setImgOk] = useState(true);
  const internal = !!banner.link && banner.link.startsWith("/");

  const inner = (
    <div className="group relative overflow-hidden rounded-3xl glass-strong shadow-card min-h-36 sm:min-h-44 flex items-center transition hover:border-primary/40 hover:shadow-glow">
      {/* gradient base */}
      <div className="absolute inset-0 bg-gradient-to-l from-primary/25 via-primary/10 to-transparent" />
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />

      {/* visual (hidden if the URL isn't a loadable image) */}
      {imgOk && (
        <img
          src={banner.image_url}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setImgOk(false)}
          className="absolute left-0 inset-y-0 h-full w-2/5 object-contain object-left p-3 drop-shadow-[0_16px_30px_rgba(37,99,235,0.35)] transition-transform duration-300 group-hover:scale-105"
        />
      )}

      <div className="relative z-10 flex-1 p-5 sm:p-6" style={{ maxWidth: imgOk ? "62%" : "100%" }}>
        {banner.title && (
          <div className="font-display text-lg sm:text-2xl font-black leading-tight">
            {banner.title}
          </div>
        )}
        {banner.subtitle && (
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {banner.subtitle}
          </p>
        )}
        {banner.link && (
          <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary-glow">
            اكتشف الآن
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          </span>
        )}
      </div>
    </div>
  );

  if (internal) {
    return (
      <Link to={banner.link as string} className="block">
        {inner}
      </Link>
    );
  }
  if (banner.link) {
    return (
      <a href={banner.link} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return inner;
}
