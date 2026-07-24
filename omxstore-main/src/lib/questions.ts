import { supabase } from "@/integrations/supabase/client";

/**
 * OMEX — product Q&A data access.
 * Anon reads PUBLISHED answered questions (RLS); signed-in users insert
 * their own (pending until the admin answers + publishes) and can see
 * their pending ones. Reads are fail-safe: errors → empty lists.
 */

export type ProductQuestion = {
  id: string;
  question: string;
  answer: string | null;
  is_published: boolean;
  created_at: string;
};

/** Published, answered Q&As for a product (by DB uuid), newest first. */
export async function fetchPublishedQuestions(productDbId: string): Promise<ProductQuestion[]> {
  try {
    const { data, error } = await supabase
      .from("product_questions")
      .select("id,question,answer,is_published,created_at")
      .eq("product_id", productDbId)
      .eq("is_published", true)
      .not("answer", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data ?? []) as unknown as ProductQuestion[];
  } catch (err) {
    console.error("[questions] fetchPublishedQuestions failed:", err);
    return [];
  }
}

/** The caller's own still-unanswered questions on this product. */
export async function fetchMyPendingQuestions(
  productDbId: string,
  userId: string,
): Promise<ProductQuestion[]> {
  try {
    const { data, error } = await supabase
      .from("product_questions")
      .select("id,question,answer,is_published,created_at")
      .eq("product_id", productDbId)
      .eq("user_id", userId)
      .is("answer", null)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return (data ?? []) as unknown as ProductQuestion[];
  } catch (err) {
    console.error("[questions] fetchMyPendingQuestions failed:", err);
    return [];
  }
}

/** Submit a new question (requires a signed-in user; RLS-enforced). */
export async function submitQuestion(
  productDbId: string,
  userId: string,
  question: string,
): Promise<{ ok: boolean; message: string }> {
  const clean = question.trim();
  if (clean.length < 5) return { ok: false, message: "السؤال قصير جداً" };
  if (clean.length > 500) return { ok: false, message: "السؤال طويل جداً (الحد 500 حرف)" };
  const { error } = await supabase
    .from("product_questions")
    .insert({ product_id: productDbId, user_id: userId, question: clean } as never);
  if (error) {
    console.error("[questions] submit failed:", error);
    if (String(error.message ?? "").includes("too_many_pending_questions")) {
      return { ok: false, message: "لديك 5 أسئلة بانتظار الإجابة — سنرد عليها أولاً 😊" };
    }
    return { ok: false, message: "تعذّر إرسال السؤال. حاول مجدداً." };
  }
  return { ok: true, message: "استلمنا سؤالك — سنُنبّهك فور الإجابة 🔔" };
}
