import Anthropic from "@anthropic-ai/sdk";
import { COMBINED_PROMPT } from "../prompts/combined";
import { SUMMARY_PROMPT } from "../prompts/summary";

// Cache the client after first init (dynamic import needed for ESM-only package)
let _client: any = null;

async function getClient() {
  if (_client) return _client;

  const base = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  if (process.env.TOKEN_COMPANY_API_KEY) {
    try {
      const { withCompression } = await import("the-token-company/anthropic");
      _client = withCompression(base, {
        compressionApiKey: process.env.TOKEN_COMPANY_API_KEY,
        aggressiveness: { system: 0.1, user: 0.4 },
      });
      console.log("Token Company compression enabled");
      return _client;
    } catch (e) {
      console.log("Token Company init failed — using plain Anthropic:", (e as Error).message);
    }
  }

  _client = base;
  return _client;
}

function stripFences(text: string): string {
  return text.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
}

export async function processCheckin(transcript: string) {
  const client = await getClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: COMBINED_PROMPT(transcript) }],
  });
  return JSON.parse(stripFences(response.content[0].text));
}

export async function generateSummary(checkinHistory: string) {
  const client = await getClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: SUMMARY_PROMPT(checkinHistory) }],
  });
  return JSON.parse(stripFences(response.content[0].text));
}
