import { supabase } from "@/integrations/supabase/client";

/**
 * OMEX — referral capture & claim.
 * The invite link is /auth?ref=OMXxxxxxx. The code is stored locally when
 * the visitor lands, and claimed (once, server-validated) as soon as an
 * authenticated session exists. Rewards are granted by the database only
 * after the friend's FIRST order is DELIVERED.
 */
const KEY = "omex_ref_code";

export function storeReferralCode(code: string | undefined | null) {
  if (typeof window === "undefined" || !code) return;
  const clean = code.trim().toUpperCase();
  if (/^OMX[A-Z0-9]{4,10}$/.test(clean)) localStorage.setItem(KEY, clean);
}

/** Returns true when a referral was newly claimed for this user. */
export async function claimStoredReferral(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const code = localStorage.getItem(KEY);
  if (!code) return false;
  try {
    const { data, error } = await supabase.rpc("claim_referral_v1", { _code: code } as never);
    if (error) throw error;
    // Whatever the verdict (ok / already_claimed / invalid_code / ...), the
    // decision is final — stop retrying on future visits.
    localStorage.removeItem(KEY);
    return !!(data as unknown as { ok: boolean }).ok;
  } catch {
    // Transient failure: keep the stored code for the next attempt.
    return false;
  }
}
