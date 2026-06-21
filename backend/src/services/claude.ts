import Anthropic from "@anthropic-ai/sdk";
import { createRequire } from "module";

// ESM has no `require`; create one so an optional CJS dependency can be loaded
// lazily without making this whole module async.
const require = createRequire(import.meta.url);

// The Token Company wrapper (plan issue B + LOW note).
// The JS export name may differ from the docs' snake_case `with_compression`
// (could be `withCompression`). Verify against the installed package, and keep
// a no-op passthrough fallback so a wrapper hiccup never blocks the demo.
//
// IMPORTANT (plan issue B): compression deletes "low-signal" input tokens. Only
// the natural-language transcript/history should be compressed — never the JSON
// schema / format instructions. Keep format instructions outside any compressed
// span, or confirm empirically that structured output survives.
function buildClient(): Anthropic {
  const base = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const key = process.env.TOKEN_COMPANY_API_KEY;
  if (!key) return base;
  try {
    const tc = require("the-token-company");
    const wrap = tc.with_compression ?? tc.withCompression ?? tc.default;
    if (typeof wrap === "function") {
      console.log("[token-company] compression wrapper active");
      return wrap(base, { compression_api_key: key });
    }
    console.warn("[token-company] wrapper export not found; using passthrough");
  } catch {
    console.warn("[token-company] package not installed; using passthrough");
  }
  return base;
}

export const anthropic = buildClient();

export const EXTRACTION_MODEL = process.env.EXTRACTION_MODEL ?? "claude-haiku-4-5";
export const SUMMARY_MODEL = process.env.SUMMARY_MODEL ?? "claude-sonnet-4-6";

/**
 * Robust JSON extraction from a Claude text response (plan issue G).
 * Strips markdown fences and parses the first balanced JSON object.
 */
export function parseJsonResponse<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`No JSON object found in model output: ${text.slice(0, 200)}`);
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/** Convenience: single user-message call returning concatenated text. */
export async function callText(model: string, prompt: string, maxTokens: number): Promise<string> {
  const res = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
