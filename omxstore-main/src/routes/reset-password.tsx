import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Container } from "@/components/site/Container";
import { GlassPanel } from "@/components/site/GlassPanel";
import { PageHeader } from "@/components/site/PageHeader";
import { TextField } from "@/components/site/TextField";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "تعيين كلمة مرور جديدة — OMEX Store" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase places the recovery session in the URL hash and signs the user in.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم تحديث كلمة المرور بنجاح");
    navigate({ to: "/account", replace: true });
  };

  return (
    <main className="pb-10">
      <Container size="sm" className="py-6">
        <PageHeader title="تعيين كلمة مرور جديدة" subtitle="اختر كلمة مرور قوية" />
        <GlassPanel tone="strong" pad="lg">
          {!ready ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              افتح هذه الصفحة من الرابط المُرسل إلى بريدك الإلكتروني.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <TextField
                label="كلمة المرور الجديدة"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <TextField
                label="تأكيد كلمة المرور"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <Button type="submit" variant="gradient" size="pillLg" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحديث كلمة المرور"}
              </Button>
            </form>
          )}
        </GlassPanel>
      </Container>
    </main>
  );
}
