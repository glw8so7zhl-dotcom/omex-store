import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Container } from "@/components/site/Container";
import { GlassPanel } from "@/components/site/GlassPanel";
import { PageHeader } from "@/components/site/PageHeader";
import { TextField } from "@/components/site/TextField";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "استعادة كلمة المرور — OMEX Store" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("تم إرسال رابط إعادة التعيين إلى بريدك.");
  };

  return (
    <main className="pb-10">
      <Container size="sm" className="py-6">
        <PageHeader title="استعادة كلمة المرور" subtitle="أدخل بريدك لإرسال رابط إعادة التعيين" />
        <GlassPanel tone="strong" pad="lg">
          {sent ? (
            <div className="text-center space-y-3">
              <p className="text-sm">تحقق من بريدك الإلكتروني للحصول على رابط إعادة تعيين كلمة المرور.</p>
              <Link to="/auth" className="text-primary text-sm hover:underline block">
                العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <TextField
                label="البريد الإلكتروني"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" variant="gradient" size="pillLg" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال الرابط"}
              </Button>
              <Link to="/auth" className="block text-center text-xs text-muted-foreground hover:text-foreground">
                العودة لتسجيل الدخول
              </Link>
            </form>
          )}
        </GlassPanel>
      </Container>
    </main>
  );
}
