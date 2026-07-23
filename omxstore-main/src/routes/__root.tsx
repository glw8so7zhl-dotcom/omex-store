import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/lib/cart";
import { WishlistProvider } from "@/lib/wishlist";
import { AuthProvider } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { QuickViewProvider } from "@/components/site/QuickViewProvider";
import { Header } from "@/components/site/Header";
import { BottomNav } from "@/components/site/BottomNav";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { PageTransition } from "@/components/system/PageTransition";
import { RouteProgress } from "@/components/system/RouteProgress";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

// Supabase API origin (for an early preconnect on client-side data fetches).
const SUPABASE_ORIGIN: string | undefined = (() => {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    return url ? new URL(url).origin : undefined;
  } catch {
    return undefined;
  }
})();

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center glass-strong rounded-3xl shadow-card p-10 animate-rise-in">
        <h1 className="text-7xl font-black text-gradient font-display">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl gradient-primary px-5 py-2.5 text-sm font-bold text-white shadow-glow-sm"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center glass-strong rounded-3xl shadow-card p-10 animate-rise-in">
        <h1 className="text-xl font-semibold">لم يتم تحميل الصفحة</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          حدث خطأ ما. جرّب تحديث الصفحة أو العودة للرئيسية.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-2xl gradient-primary px-5 py-2.5 text-sm font-bold text-white shadow-glow-sm"
          >
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="rounded-2xl border border-white/10 bg-surface px-5 py-2.5 text-sm font-semibold"
          >
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#050816" },
      { title: "متجر OMEX — اختيارك الأفضل" },
      {
        name: "description",
        content:
          "متجر أومكس OMEX Store — تجربة تسوق مستقبلية بأفضل المنتجات الأصلية وتوصيل لجميع المحافظات اليمنية.",
      },
      { property: "og:title", content: "متجر OMEX — اختيارك الأفضل" },
      {
        property: "og:description",
        content:
          "متجر أومكس OMEX Store — تجربة تسوق مستقبلية بأفضل المنتجات الأصلية وتوصيل لجميع المحافظات اليمنية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "متجر OMEX — اختيارك الأفضل" },
      {
        name: "twitter:description",
        content:
          "متجر أومكس OMEX Store — تجربة تسوق مستقبلية بأفضل المنتجات الأصلية وتوصيل لجميع المحافظات اليمنية.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      ...(SUPABASE_ORIGIN
        ? [{ rel: "preconnect", href: SUPABASE_ORIGIN, crossOrigin: "anonymous" }]
        : []),
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <QuickViewProvider>
              <div className="relative min-h-screen">
                <RouteProgress />
                <Header />
                <PageTransition>
                  <Outlet />
                </PageTransition>
                <BottomNav />
                <WhatsAppFab />
              </div>
              <Toaster position="top-center" richColors />
            </QuickViewProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
