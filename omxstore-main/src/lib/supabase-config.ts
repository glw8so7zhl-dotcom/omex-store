/**
 * OMEX — resilient public Supabase configuration.
 *
 * The URL and PUBLISHABLE (anon) key are public by design — they ship inside
 * every client bundle. Baking them here as FALLBACK defaults makes the app
 * survive hosting-dashboard env mistakes entirely for public flows.
 *
 * Precedence: valid env values win. Values that are empty OR point at the
 * retired Lovable Cloud backend (migrated to the user-owned Supabase project
 * on 2026-07-23) are treated as stale and replaced by the defaults below.
 *
 * NOTE: secrets (e.g. SUPABASE_SERVICE_ROLE_KEY) must NEVER be added here.
 */
export const DEFAULT_SUPABASE_URL = "https://bursjyexairnbplwftgc.supabase.co";
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_s6hWONowCUkhpCCj2cslFg_MloAOh-N";

/** Strip whitespace and wrapping quotes pasted into dashboard env editors. */
export function cleanEnvValue(v: string | undefined | null): string {
  return (v ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

/** Resolve the public Supabase URL + publishable key with stale-env fallback. */
export function resolvePublicSupabaseConfig(
  rawUrl: string | undefined,
  rawKey: string | undefined,
): { url: string; key: string } {
  let url = cleanEnvValue(rawUrl);
  let key = cleanEnvValue(rawKey);

  const stale =
    !url || !/^https?:\/\//i.test(url) || url.includes("lovable.cloud");
  if (stale) {
    if (url && url.includes("lovable.cloud")) {
      console.warn(
        "[Supabase] Stale lovable.cloud env detected — using the built-in project config.",
      );
    }
    url = DEFAULT_SUPABASE_URL;
    key = DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  }
  if (!key) key = DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  return { url, key };
}
