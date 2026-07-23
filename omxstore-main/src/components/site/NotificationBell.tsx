import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "الآن";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG");
}

const BTN_CLS =
  "relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface/70 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition";

/**
 * OMEX — real notifications bell.
 * Reads the signed-in user's rows from the `notifications` table (RLS scopes
 * them to the owner), shows an unread badge, and marks everything read when
 * the panel opens. Guests get a bell that simply links to sign-in.
 */
export function NotificationBell() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("notifications")
        .select("id,title,body,link,is_read,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (rows ?? []) as unknown as Notification[];
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  // Close on outside click.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  // Guests: bell simply links to sign-in.
  if (!userId) {
    return (
      <Link to="/auth" aria-label="التنبيهات" className={cn(BTN_CLS, "hidden sm:inline-flex")}>
        <Bell className="h-5 w-5" />
      </Link>
    );
  }

  const items = data ?? [];
  const unread = items.filter((n) => !n.is_read).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) markAllRead.mutate();
  };

  const openLink = (n: Notification) => {
    setOpen(false);
    if (n.link) navigate({ to: n.link } as never);
  };

  return (
    <div ref={boxRef} className="relative">
      <button aria-label="التنبيهات" onClick={toggle} className={BTN_CLS}>
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-sale text-[10px] font-bold text-white shadow-glow-sm">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 max-w-[90vw] glass-strong rounded-2xl border border-white/10 shadow-card z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="font-display text-sm font-black">التنبيهات</span>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="inline-flex items-center gap-1 text-[11px] text-primary-glow hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> تعليم الكل كمقروء
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto h-7 w-7 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">لا توجد تنبيهات بعد</p>
              </div>
            ) : (
              items.map((n) => {
                const inner = (
                  <>
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sale shadow-glow-sm" />
                      )}
                      <div className={cn("min-w-0 flex-1", n.is_read && "ps-4")}>
                        <div className="text-sm font-bold truncate">{n.title}</div>
                        {n.body && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{n.body}</p>
                        )}
                        <div className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  </>
                );
                return n.link ? (
                  <button
                    key={n.id}
                    onClick={() => openLink(n)}
                    className="block w-full text-right px-4 py-3 border-b border-white/5 last:border-0 hover:bg-primary/5 transition"
                  >
                    {inner}
                  </button>
                ) : (
                  <div key={n.id} className="px-4 py-3 border-b border-white/5 last:border-0">
                    {inner}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
