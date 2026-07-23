import { supabase } from "@/integrations/supabase/client";

/**
 * OMEX — reviews data access.
 * Anon can read APPROVED reviews only (RLS); signed-in users insert their own
 * (pending admin approval). All reads are fail-safe: errors → empty results.
 */

export type ProductReview = {
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
};

export type TopReview = ProductReview & { product_id: string };

export type ReviewsSummary = {
  list: ProductReview[];
  count: number;
  average: number;
};

/** Approved reviews for one product (by DB uuid), newest first. */
export async function fetchProductReviews(productDbId: string): Promise<ReviewsSummary> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("rating,title,body,created_at")
      .eq("product_id", productDbId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    const list = (data ?? []) as unknown as ProductReview[];
    const count = list.length;
    const average = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0;
    return { list, count, average: Math.round(average * 10) / 10 };
  } catch (err) {
    console.error("[reviews] fetchProductReviews failed:", err);
    return { list: [], count: 0, average: 0 };
  }
}

/** Best approved reviews across the store (testimonials). */
export async function fetchTopReviews(limit = 6): Promise<TopReview[]> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("rating,title,body,created_at,product_id")
      .gte("rating", 4)
      .not("body", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as TopReview[];
  } catch (err) {
    console.error("[reviews] fetchTopReviews failed:", err);
    return [];
  }
}

/** Submit a review as the signed-in user (lands pending approval). */
export async function submitReview(input: {
  productDbId: string;
  userId: string;
  rating: number;
  title?: string;
  body?: string;
}): Promise<{ ok: boolean; message: string }> {
  const { error } = await supabase.from("reviews").insert({
    product_id: input.productDbId,
    user_id: input.userId,
    rating: input.rating,
    title: input.title?.trim() || null,
    body: input.body?.trim() || null,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "لقد قيّمت هذا المنتج من قبل." };
    }
    console.error("[reviews] submit failed:", error);
    return { ok: false, message: "تعذّر إرسال التقييم. حاول مرة أخرى." };
  }
  return { ok: true, message: "شكراً لك! سيظهر تقييمك بعد مراجعته." };
}
