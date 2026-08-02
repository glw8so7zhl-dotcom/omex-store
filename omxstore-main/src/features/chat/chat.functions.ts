import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Simple in-memory rate limiter (per-process). Not suitable for multi-instance
// production — consider Redis or a global rate limiter for production use.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per IP per window
const ipBuckets: Record<string, { count: number; resetAt: number }> = {};

function rateLimit(ip: string) {
  const now = Date.now();
  const bucket = ipBuckets[ip] || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  bucket.count += 1;
  ipBuckets[ip] = bucket;
  return bucket.count <= RATE_LIMIT_MAX;
}

const messagesSchema = z.object({
  messages: z
    .array(
      z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1).max(2000) }),
    )
    .min(1)
    .max(20),
});

export const chat = createServerFn({ method: "POST" })
  .inputValidator((d) => messagesSchema.parse(d))
  .handler(async ({ data }) => {
    // Basic rate limit by IP
    let ip = "unknown";
    try {
      // TanStack react-start exposes request via getRequest in server context sometimes,
      // but createServerFn handler may not have direct access. We'll attempt to read
      // from (global as any).__req for environments where it's set, otherwise skip.
      // If you deploy to an environment that provides request IP differently,
      // replace this logic with the proper extraction.
      // NOTE: This is a best-effort; rate limiting here is advisory.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req = (global as any).__req as Request | undefined;
      if (req) {
        ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || "") as string;
      }
    } catch (e) {
      // ignore
    }

    if (!rateLimit(ip)) {
      throw new Error("Rate limit exceeded. Try again later.");
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured on the server");

    // Build the request to the OpenAI Responses API
    // Using the Responses API: POST https://api.openai.com/v1/responses
    const body = {
      model: "gpt-4o-mini", // lightweight model; you can change this
      input: data.messages.map((m) => ({ role: m.role, content: m.content })),
      // You can tune temperature, max_output_tokens, etc. here.
      // Keep responses short by default to avoid large tokens.
      max_output_tokens: 800,
      temperature: 0.2,
    } as any;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000); // 20s timeout

    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("OpenAI responded with non-OK status", res.status, txt);
        throw new Error("OpenAI API error");
      }

      const json = await res.json();

      // Responses API returns an array of outputs; pick the first textual output.
      // The shape can vary; defensively extract text.
      const output = (json.output && json.output[0]) || json;
      let content: string | null = null;
      if (output && typeof output === "object") {
        if (output.content) {
          // content might be an array of { type, text }
          if (Array.isArray(output.content)) {
            content = output.content.map((c: any) => c?.text ?? "").join("");
          } else if (typeof output.content === "string") {
            content = output.content;
          }
        } else if (typeof output.text === "string") {
          content = output.text;
        } else if (json?.output_text) {
          content = json.output_text as string;
        }
      }

      if (!content) content = "(لم يتم توليد رد)";

      return { content };
    } catch (err) {
      if ((err as any)?.name === "AbortError") {
        console.error("OpenAI request timed out");
        throw new Error("Request timed out contacting the model");
      }
      console.error("OpenAI request failed", err);
      throw new Error("Failed to contact OpenAI API");
    } finally {
      clearTimeout(timeout);
    }
  });
