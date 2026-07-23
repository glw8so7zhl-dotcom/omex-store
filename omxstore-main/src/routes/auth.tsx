import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { Container } from "@/components/site/Container";
import { GlassPanel } from "@/components/site/GlassPanel";
import { PageHeader } from "@/components/site/PageHeader";
import { TextField } from "@/components/site/TextField";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { claimStoredReferral, storeReferralCode } from "@/lib/referral";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["login", "register"]).optional(),
  ref: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — OMEX Store" },
      { name: "description", content: "سجّل الدخول إلى متجر OMEX أو أنشئ حساباً جديداً." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(search.mode ?? "login");

  // Referral invite links: /auth?ref=OMXxxxxxx
  useEffect(() => {
    storeReferralCode(search.ref);
  }, [search.ref]);

  useEffect(() => {
    if (!loading && session) {
      claimStoredReferral().then((claimed) => {
        if (claimed) {
          toast.success("تم تسجيل دعوة صديقك 🎁 — ستكسبان 200 نقطة لكل منكما بعد أول طلب مُسلَّم");
        }
      });
      const target = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/account";
      navigate({ to: target, replace: true });
    }
  }, [session, loading, search.redirect, navigate]);

  return (
    <main className="pb-10">
      <Container size="sm" className="py-6">
        <PageHeader title={mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"} subtitle="مرحباً بك في OMEX Store" />

        <GlassPanel tone="strong" pad="lg">
          <div className="grid grid-cols-2 gap-2 mb-5">
            <Button
              variant={mode === "login" ? "gradient" : "glass"}
              size="pill"
              onClick={() => setMode("login")}
            >
              <LogIn className="h-4 w-4 ml-1" /> دخول
            </Button>
            <Button
              variant={mode === "register" ? "gradient" : "glass"}
              size="pill"
              onClick={() => setMode("register")}
            >
              <UserPlus className="h-4 w-4 ml-1" /> تسجيل
            </Button>
          </div>

          {mode === "login" ? (
            <LoginForm
              onSuccess={() => {
                const target =
                  search.redirect && search.redirect.startsWith("/") ? search.redirect : "/account";
                router.invalidate();
                navigate({ to: target, replace: true });
              }}
            />
          ) : (
            <RegisterForm onSwitch={() => setMode("login")} />
          )}
        </GlassPanel>
      </Container>
    </main>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "بيانات الدخول غير صحيحة" : error.message);
      return;
    }
    toast.success("تم تسجيل الدخول");
    onSuccess();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <TextField
        label="البريد الإلكتروني"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="كلمة المرور"
        type="password"
        autoComplete="current-password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex justify-end">
        <Link to="/forgot-password" className="text-xs text-primary hover:underline">
          نسيت كلمة المرور؟
        </Link>
      </div>
      <Button type="submit" variant="gradient" size="pillLg" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "دخول"}
      </Button>
    </form>
  );
}

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
        data: { full_name: fullName.trim(), phone: phone.trim() },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم إنشاء الحساب. تفقّد بريدك لتفعيل الحساب.");
    onSwitch();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <TextField
        label="الاسم الكامل"
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      <TextField
        label="البريد الإلكتروني"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="رقم الهاتف (اختياري)"
        type="tel"
        autoComplete="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <TextField
        label="كلمة المرور"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <p className="text-[11px] text-muted-foreground">
        سنرسل رابط تفعيل إلى بريدك الإلكتروني.
      </p>
      <Button type="submit" variant="gradient" size="pillLg" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء الحساب"}
      </Button>
    </form>
  );
}
