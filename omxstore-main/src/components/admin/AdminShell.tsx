import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  Boxes,
  Ticket,
  Image as ImageIcon,
  BarChart3,
  MessageCircleQuestion,
  Star,
  Settings as SettingsIcon,
  Bell,
  ShieldCheck,
  KeyRound,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/site/Container";
import { GlassPanel } from "@/components/site/GlassPanel";
import { Button } from "@/components/ui/button";

type NavItem = { to: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { to: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/admin/products", label: "المنتجات", icon: Package },
  { to: "/admin/categories", label: "التصنيفات", icon: FolderTree },
  { to: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
  { to: "/admin/customers", label: "العملاء", icon: Users },
  { to: "/admin/inventory", label: "المخزون", icon: Boxes },
  { to: "/admin/coupons", label: "الكوبونات", icon: Ticket },
  { to: "/admin/banners", label: "البانرات", icon: ImageIcon },
  { to: "/admin/reviews", label: "التقييمات", icon: Star },
  { to: "/admin/questions", label: "الأسئلة", icon: MessageCircleQuestion },
  { to: "/admin/analytics", label: "الإحصائيات", icon: BarChart3 },
  { to: "/admin/notifications", label: "التنبيهات", icon: Bell },
  { to: "/admin/roles", label: "المدراء والأدوار", icon: ShieldCheck },
  { to: "/admin/settings", label: "الإعدادات", icon: SettingsIcon },
];

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <main className="pb-16">
      <Container size="xl" className="py-4 sm:py-6">
        <div className="flex gap-4">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block w-64 shrink-0">
            <SidebarContent pathname={pathname} onNavigate={() => {}} />
          </aside>

          {/* Sidebar (mobile drawer) */}
          {open && (
            <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <div
                className="absolute inset-y-0 right-0 w-72 max-w-[85vw] p-3 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <SidebarContent
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                  onClose={() => setOpen(false)}
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-4">
            <GlassPanel pad="md" className="flex items-center gap-3">
              <Button
                variant="glass"
                size="icon"
                className="lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="فتح القائمة"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-lg sm:text-xl font-black truncate">{title}</h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </GlassPanel>
            {children}
          </div>
        </div>
      </Container>
    </main>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
  onClose,
}: {
  pathname: string;
  onNavigate: () => void;
  onClose?: () => void;
}) {
  return (
    <GlassPanel tone="strong" pad="sm" className="lg:sticky lg:top-4">
      <div className="flex items-center justify-between px-2 py-1 mb-2">
        <div className="font-display text-sm font-black text-gradient">OMEX Admin</div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-white/5"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="space-y-1">
        {NAV.map((item) => {
          const active =
            item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                active
                  ? "gradient-primary text-white shadow-glow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </GlassPanel>
  );
}
