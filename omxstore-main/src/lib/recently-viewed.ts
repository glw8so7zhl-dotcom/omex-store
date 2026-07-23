/**
 * OMEX — recently-viewed products (localStorage, by product slug).
 * SSR-safe: all access happens inside guards; consumers render client-side.
 */
const KEY = "omex-recent-v1";
const MAX = 8;

export function recordRecentlyViewed(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    const cur: string[] = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    const next = [slug, ...cur.filter((s) => s !== slug)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}
