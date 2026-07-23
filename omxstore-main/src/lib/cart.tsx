import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Product } from "./products";
import { useAuth } from "@/hooks/use-auth";
import { fetchProducts } from "@/lib/catalog";
import { pullUserCart, pushUserCart } from "@/lib/user-cart";

export type CartItem = { product: Product; qty: number };

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  add: (p: Product, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE = "omex-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();
  // Account sync gate: pushes are allowed only after the restore attempt
  // for this user finished (otherwise an empty fresh device would wipe
  // the account cart before we had a chance to pull it).
  const syncReadyFor = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !loaded) return;
    window.localStorage.setItem(STORAGE, JSON.stringify(items));
  }, [items, loaded]);

  // Cross-device restore: on sign-in with an empty local cart, adopt the
  // account cart (lines are {productId(slug), qty}; hydrate from catalog).
  useEffect(() => {
    if (!loaded || !user) return;
    if (syncReadyFor.current === user.id) return;
    let cancelled = false;
    (async () => {
      try {
        if (items.length === 0) {
          const lines = await pullUserCart(user.id);
          if (!cancelled && lines && lines.length > 0) {
            const all = await fetchProducts();
            const bySlug = new Map(all.map((p) => [p.id, p]));
            const restored: CartItem[] = [];
            for (const l of lines) {
              const prod = bySlug.get(l.productId);
              if (prod && l.qty > 0) restored.push({ product: prod, qty: Math.min(l.qty, 999) });
            }
            if (!cancelled && restored.length > 0) setItems(restored);
          }
        }
      } finally {
        if (!cancelled) syncReadyFor.current = user.id;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, user?.id]);

  // Debounced push: mirror every change (including emptying after an
  // order) to the account cart once restore settled.
  useEffect(() => {
    if (typeof window === "undefined" || !loaded || !user) return;
    if (syncReadyFor.current !== user.id) return;
    const t = window.setTimeout(() => {
      pushUserCart(
        user.id,
        items.map((i) => ({ productId: i.product.id, qty: i.qty })),
      );
    }, 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, loaded, user?.id]);

  const api = useMemo<CartCtx>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      total: items.reduce((s, i) => s + i.qty * i.product.price, 0),
      add: (p, qty = 1) =>
        setItems((prev) => {
          const existing = prev.find((i) => i.product.id === p.id);
          if (existing) return prev.map((i) => (i.product.id === p.id ? { ...i, qty: i.qty + qty } : i));
          return [...prev, { product: p, qty }];
        }),
      remove: (id) => setItems((prev) => prev.filter((i) => i.product.id !== id)),
      setQty: (id, qty) =>
        setItems((prev) =>
          prev.map((i) => (i.product.id === id ? { ...i, qty: Math.max(1, qty) } : i)),
        ),
      clear: () => setItems([]),
    }),
    [items],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
