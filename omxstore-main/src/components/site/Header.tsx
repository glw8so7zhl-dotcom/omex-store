import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Flame, Heart, LogIn, Search, ShoppingBag, User } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const { session } = useAuth();
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (query) navigate({ to: "/search", search: { q: query } });
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass-strong border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:h-20 md:gap-5">
          <Link to="/" className="group flex items-center gap-2 shrink-0">
            <div className="relative grid h-10 w-10 place-items-center rounded-2xl gradient-primary shadow-glow-sm">
              <span className="font-display text-lg font-black text-white">O</span>
              <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl -z-10 group-hover:bg-primary/50 transition" />
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="font-display text-lg font-black tracking-tight">OMEX</div>
              <div className="text-[10px] text-muted-foreground -mt-0.5">اختيارك الأفضل</div>
            </div>
          </Link>

          <form role="search" onSubmit={submitSearch} className="flex-1 relative">
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
              placeholder="ابحث عن أي منتج..."
              aria-label="ابحث عن المنتجات"
              autoComplete="off"
              className="h-11 w-full rounded-2xl bg-surface/70 border border-white/10 pr-10 pl-4 text-sm placeholder:text-muted-foreground outline-none transition-[color,border-color,box-shadow] hover:border-white/20 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </form>

          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <Link
              to="/offers"
              className="hidden md:inline-flex items-center gap-1.5 rounded-2xl bg-sale/15 border border-sale/30 px-3 h-11 text-sm font-bold text-sale hover:bg-sale/25 transition"
            >
              <Flame className="h-4 w-4" />
              العروض
            </Link>
            <IconBtn label="التنبيهات">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 left-1.5 h-2 w-2 rounded-full bg-sale animate-pulse-glow" />
            </IconBtn>
            <Link
              to="/favorites"
              aria-label="المفضلة"
              className="relative hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface/70 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition"
            >
              <Heart className="h-5 w-5" />
              {wishCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-sale text-[10px] font-bold text-white shadow-glow-sm">
                  {wishCount}
                </span>
              )}
            </Link>
            <Link
              to="/cart"
              aria-label="السلة"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface/70 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="absolute -top-1 -left-1 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-sale text-[10px] font-bold text-white shadow-glow-sm"
                >
                  {count}
                </motion.span>
              )}
            </Link>
            <Link
              to={session ? "/account" : "/auth"}
              aria-label={session ? "حسابي" : "تسجيل الدخول"}
              className="relative hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface/70 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition"
            >
              {session ? <User className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function IconBtn({
  children,
  label,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <button
      aria-label={label}
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface/70 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition ${className}`}
    >
      {children}
    </button>
  );
}
