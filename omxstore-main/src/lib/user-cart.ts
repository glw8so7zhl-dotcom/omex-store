import { supabase } from "@/integrations/supabase/client";

/**
 * OMEX — account cart sync (signed-in users).
 * The cart is mirrored to `user_carts` (RLS: own row only) so it follows
 * the customer across devices and powers the abandoned-cart reminders.
 * Lines are stored minimally as { productId (slug), qty }.
 */

export type SyncedCartLine = { productId: string; qty: number };

export async function pushUserCart(userId: string, lines: SyncedCartLine[]): Promise<void> {
  try {
    const { error } = await supabase.from("user_carts").upsert(
      {
        user_id: userId,
        items: lines,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id" },
    );
    if (error) throw error;
  } catch (err) {
    console.error("[user-cart] push failed:", err);
  }
}

export async function pullUserCart(userId: string): Promise<SyncedCartLine[] | null> {
  try {
    const { data, error } = await supabase
      .from("user_carts")
      .select("items")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    const items = (data as unknown as { items: SyncedCartLine[] } | null)?.items;
    return Array.isArray(items) ? items : null;
  } catch (err) {
    console.error("[user-cart] pull failed:", err);
    return null;
  }
}
