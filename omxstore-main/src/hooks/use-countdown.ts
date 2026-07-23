import { useEffect, useState } from "react";

/**
 * OMEX — live countdown to an ISO deadline.
 * Returns "HH:MM:SS" (total hours, so multi-day reads 71:59:59), "00:00:00"
 * once passed, or null when there is no valid target (render nothing).
 * Starts as null on the server and first client paint — no hydration drift.
 */
export function useCountdown(target?: string | null): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      setLabel(null);
      return;
    }
    const end = new Date(target).getTime();
    if (Number.isNaN(end)) {
      setLabel(null);
      return;
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) {
        setLabel("00:00:00");
        return;
      }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setLabel(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  return label;
}
