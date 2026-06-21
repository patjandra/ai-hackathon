import Anthropic from "@anthropic-ai/sdk";
import { TheTokenCompany } from "the-token-company";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const tokenCompany = process.env.TOKEN_COMPANY_API_KEY
  ? new TheTokenCompany({
      apiKey: process.env.TOKEN_COMPANY_API_KEY,
      appId: "interim-previsit",
    })
  : null;

if (tokenCompany) {
  console.log("[token-company] compression active for summary histories");
} else {
  console.warn("[token-company] API key missing; using uncompressed summary histories");
}

export const EXTRACTION_MODEL = process.env.EXTRACTION_MODEL ?? "claude-haiku-4-5";
export const SUMMARY_MODEL = process.env.SUMMARY_MODEL ?? "claude-sonnet-4-6";

/**
 * Compress only natural-language/data spans before they are inserted into a
 * larger prompt. Never send JSON schemas or output-format instructions through
 * compression. Failure falls back to the original text so check-ins keep working.
 */
export async function compressPromptData(text: string): Promise<string> {
  if (!tokenCompany || text.length < 500) return text;
  try {
    const result = await tokenCompany.compress(text, {
      model: "bear-2",
      aggressiveness: 0.2,
    });
    console.log(
      `[token-company] ${result.inputTokens} → ${result.outputTokens} tokens (${result.tokensSaved} saved)`,
    );
    return result.output;
  } catch (error) {
    console.warn("[token-company] compression failed; using original text", error);
    return text;
  }
}

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
