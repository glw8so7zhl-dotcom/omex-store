import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCart } from "@/lib/cart";

const items: Array<{ to: string; label: string; icon: typeof Home; badge?: boolean }> = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/categories", label: "الأقسام", icon: LayoutGrid },
  { to: "/cart", label: "السلة", icon: ShoppingBag, badge: true },
  { to: "/favorites", label: "المفضلة", icon: Heart },
  { to: "/account", label: "حسابي", icon: User },
];

export function BottomNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { count } = useCart();
  const reduce = useReducedMotion();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="mx-3 mb-3 glass-strong rounded-3xl shadow-card">
        <ul className="grid grid-cols-5">
          {items.map((it) => {
            const active = path === it.to;
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <Link
                  to={it.to as never}
                  className="relative flex flex-col items-center justify-center gap-1 py-2.5"
                >
                  <span className="relative grid place-items-center h-9 w-9 rounded-2xl">
                    {active && (
                      <motion.span
                        layoutId="bottomnav-active"
                        className="absolute inset-0 rounded-2xl gradient-primary shadow-glow-sm"
                        transition={
                          reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }
                        }
                      />
                    )}
                    <Icon
                      className={`relative z-10 h-5 w-5 ${active ? "text-white" : "text-muted-foreground"}`}
                    />
                    {it.badge && count > 0 && (
                      <span className="absolute -top-1 -left-1 z-10 min-w-4 h-4 px-1 grid place-items-center rounded-full bg-sale text-[9px] font-bold text-white">
                        {count}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[10px] ${active ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                  >
                    {it.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
