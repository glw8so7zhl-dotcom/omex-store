import { supabase } from "@/integrations/supabase/client";

/**
 * OMEX — homepage promo banners, managed live from /admin/banners.
 * Active + inside their optional [starts_at, ends_at] window, ordered by
 * sort_order. Fail-safe: any error → empty list (section renders nothing).
 */

export type PromoBanner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link: string | null;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
};

export async function fetchActiveBanners(): Promise<PromoBanner[]> {
  try {
    const { data, error } = await supabase
      .from("banners")
      .select("id,title,subtitle,image_url,link,sort_order,starts_at,ends_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(8);
    if (error) throw error;
    const now = Date.now();
    return ((data ?? []) as unknown as PromoBanner[]).filter((b) => {
      if (b.starts_at && new Date(b.starts_at).getTime() > now) return false;
      if (b.ends_at && new Date(b.ends_at).getTime() < now) return false;
      return true;
    });
  } catch (err) {
    console.error("[banners] fetchActiveBanners failed:", err);
    return [];
  }
}
