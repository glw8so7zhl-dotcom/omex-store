import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, MapPin, Package, Settings, Shield, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Container } from "@/components/site/Container";
import { GlassPanel } from "@/components/site/GlassPanel";
import { IconTile } from "@/components/site/IconTile";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "حسابي — OMEX Store" }] }),
  component: AccountPage,
});

const links: Array<{
  icon: LucideIcon;
  title: string;
  sub: string;
  to?: string;
  soon?: boolean;
}> = [
  { icon: Package, title: "طلباتي", sub: "تتبّع طلباتك السابقة", to: "/orders" },
  { icon: MapPin, title: "العناوين", sub: "إدارة عناوين التوصيل", soon: true },
  { icon: Bell, title: "الإشعارات", sub: "عروض وتحديثات", soon: true },
  { icon: Settings, title: "الإعدادات", sub: "تفضيلات الحساب", soon: true },
];

function AccountPage() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <main className="pb-8">
      <Container size="md" className="py-6">
        <GlassPanel tone="strong" pad="lg">
          <div className="flex items-center gap-4">
            <IconTile icon={User} size="xl" tone="gradient" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-lg font-black truncate">
                {(user?.user_metadata?.full_name as string) || "مرحباً بك"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {isAdmin && (
              <Button asChild variant="gradient" size="pill">
                <Link to="/admin">
                  <Shield className="h-4 w-4 ml-1" /> لوحة الإدارة
                </Link>
              </Button>
            )}
            <Button
              variant="glass"
              size="pill"
              onClick={handleSignOut}
              className={isAdmin ? "" : "col-span-2"}
            >
              <LogOut className="h-4 w-4 ml-1" /> تسجيل الخروج
            </Button>
          </div>
        </GlassPanel>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((l) => {
            const inner = (
              <>
                <IconTile icon={l.icon} size="lg" tone="primarySoft" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{l.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{l.sub}</div>
                </div>
                {l.soon && (
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">
                    قريباً
                  </span>
                )}
              </>
            );
            return l.to ? (
              <Link
                key={l.title}
                to={l.to}
                className="glass rounded-2xl p-4 flex items-center gap-3 hover:border-primary/40 transition"
              >
                {inner}
              </Link>
            ) : (
              <div
                key={l.title}
                className="glass rounded-2xl p-4 flex items-center gap-3 opacity-70"
              >
                {inner}
              </div>
            );
          })}
        </div>
      </Container>
    </main>
  );
}
