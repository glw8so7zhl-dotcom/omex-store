import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toDisplayImage } from "@/lib/catalog";
import { formatPrice } from "@/lib/products";
import { cn } from "@/lib/utils";

type Suggestion = { slug: string; name: string; image: string; price: number };

/**
 * OMEX — live header search with instant suggestions.
 * Debounced call to the Arabic smart-search RPC (normalization + trigram
 * typo tolerance), rendering thumbnails + prices, with full keyboard
 * support (↑/↓ to move, Enter to open, Esc to close).
 */
export function SearchSuggest({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLFormElement>(null);
  const timer = useRef<number | undefined>(undefined);

  // Debounced live lookup.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.clearTimeout(timer.current);
    const term = q.trim().replace(/[%,()]/g, "");
    if (term.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        // Arabic smart search: normalized + typo-tolerant (search_products_v1).
        const { data, error } = await supabase.rpc("search_products_v1", {
          _q: term,
          _limit: 5,
        } as never);
        if (error) throw error;
        const list = ((data ?? []) as Array<{ slug: string; name: string; image: string | null; price: number | string }>).map(
          (r) => ({ slug: r.slug, name: r.name, image: toDisplayImage(r.image), price: Number(r.price) }),
        );
        setResults(list);
        setOpen(list.length > 0);
        setActive(-1);
      } catch {
        setResults([]);
      }
    }, 220);
    return () => window.clearTimeout(timer.current);
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const goSearch = () => {
    const query = q.trim();
    if (!query) return;
    setOpen(false);
    navigate({ to: "/search", search: { q: query } });
  };

  const goProduct = (slug: string) => {
    setOpen(false);
    setQ("");
    navigate({ to: "/products/$id", params: { id: slug } });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      goProduct(results[active].slug);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <form
      ref={boxRef}
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        goSearch();
      }}
    >
      <label htmlFor="site-search" className="sr-only">
        ابحث عن المنتجات
      </label>
      <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        id="site-search"
        name="q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="ابحث عن أي منتج..."
        aria-label="ابحث عن المنتجات"
        aria-expanded={open}
        autoComplete="off"
        className="h-11 w-full rounded-2xl bg-surface/70 border border-white/10 pr-10 pl-4 text-sm placeholder:text-muted-foreground outline-none transition-[color,border-color,box-shadow] hover:border-white/20 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
      />

      {open && (
        <div className="absolute top-full mt-2 inset-x-0 z-50 glass-strong rounded-2xl shadow-elevated overflow-hidden animate-rise-in">
          <ul role="listbox" aria-label="اقتراحات البحث">
            {results.map((r, i) => (
              <li key={r.slug} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => goProduct(r.slug)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-right transition",
                    i === active ? "bg-primary/15" : "hover:bg-white/5",
                  )}
                >
                  <span className="h-10 w-10 rounded-xl bg-surface-2 grid place-items-center p-1 shrink-0">
                    <img src={r.image} alt="" loading="lazy" width={40} height={40} className="max-h-full max-w-full object-contain" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm truncate">{r.name}</span>
                  <span className="shrink-0 text-xs font-bold text-gradient font-display">
                    {formatPrice(r.price)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={goSearch}
            className="w-full border-t border-white/10 px-3 py-2 text-xs text-primary-glow hover:bg-white/5 transition"
          >
            عرض كل النتائج عن "{q.trim()}"
          </button>
        </div>
      )}
    </form>
  );
}
