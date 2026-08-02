import React, { useState, useEffect, useRef } from "react";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  async function send() {
    setError(null);
    const trimmed = input.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      setError("الرسالة طويلة جداً (الحد الأقصى 2000 حرف)");
      return;
    }

    const userMessage = { role: "user", content: trimmed };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/server-fn/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Server error");
      }

      const json = await res.json();
      if (json?.content) {
        setMessages((m) => [...m, { role: "assistant", content: json.content }]);
      } else {
        setError("لم يصدر رد من النموذج");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "فشل الإرسال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 left-6 md:bottom-8 md:left-8 z-50">
      <div className="w-80 md:w-96 bg-surface rounded-xl shadow-card overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-white/5">
          <strong>مساعد OMEX</strong>
          <div className="flex items-center gap-2">
            {error ? <span className="text-xs text-red-400">{error}</span> : null}
            <button
              className="rounded-full bg-muted px-2 py-1 text-xs"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? "إخفاء" : "فتح"}
            </button>
          </div>
        </div>

        {open ? (
          <div className="flex flex-col h-80">
            <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-2">
              {messages.length === 0 ? (
                <div className="text-sm text-muted-foreground">مرحباً! اسألني عن المشروع أو الصفحات.</div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={m.role === "assistant" ? "text-sm text-left" : "text-sm text-right"}>
                    <div className={`inline-block p-2 rounded-lg ${m.role === "assistant" ? "bg-surface-2" : "bg-primary text-white"}`}>
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg bg-background/50 px-3 py-2 outline-none"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!loading) send();
                    }
                  }}
                />
                <button
                  className="rounded-lg gradient-primary px-3 py-2 text-white"
                  onClick={() => send()}
                  disabled={loading}
                >
                  {loading ? "..." : "إرسال"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ChatWidget;
