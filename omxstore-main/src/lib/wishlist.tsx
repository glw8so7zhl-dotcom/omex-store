import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * OMEX — wishlist (favorites) store.
 *
 * Persisted to localStorage keyed by product slug (= Product.id), so it works
 * for guests and signed-in users alike, mirroring the cart. DB-backed sync to
 * the `wishlist` table (per-user) is a possible future enhancement.
 */
type WishlistCtx = {
  ids: string[];
  count: number;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const Ctx = createContext<WishlistCtx | null>(null);
const STORAGE = "omex-wishlist-v1";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE);
      if (raw) setIds(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE, JSON.stringify(ids));
  }, [ids]);

  const api = useMemo<WishlistCtx>(
    () => ({
      ids,
      count: ids.length,
      has: (id) => ids.includes(id),
      toggle: (id) =>
        setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
      remove: (id) => setIds((prev) => prev.filter((x) => x !== id)),
      clear: () => setIds([]),
    }),
    [ids],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWishlist() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWishlist outside WishlistProvider");
  return c;
}
