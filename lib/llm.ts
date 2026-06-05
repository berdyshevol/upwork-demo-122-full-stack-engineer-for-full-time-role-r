// BYOK (Bring Your Own Key) LLM access. All calls go through the Vercel AI SDK
// and run *in the browser* using the visitor's own key (read from localStorage),
// so the request goes browser -> provider directly and never touches our server.
// The "mock" provider returns a deterministic canned response with no network
// call, which is what the AI parts default to until a key is configured and what
// the behavioral tests use.

import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export type Provider = "anthropic" | "openai" | "google" | "mock";

export interface Byok {
  provider: Provider;
  apiKey: string;
  model: string;
}

export const PROVIDER_MODELS: Record<
  Exclude<Provider, "mock">,
  { label: string; models: string[] }
> = {
  anthropic: {
    label: "Anthropic",
    models: ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-7"],
  },
  openai: {
    label: "OpenAI",
    models: ["gpt-4o-mini", "gpt-4o", "o1-mini"],
  },
  google: {
    label: "Google",
    models: ["gemini-2.0-flash", "gemini-2.5-pro"],
  },
};

export function readByok(): Byok | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("byok");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Byok;
    if (!parsed.provider || !parsed.apiKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

function deterministicMock(prompt: string): string {
  const doc = prompt.match(/Document:\s*(.*)/)?.[1]?.trim() ?? "the document";
  return [
    "MOCK INSIGHT (no live provider configured):",
    `This ingestion run processed ${doc} through fetch → extract → embed → persist.`,
    "The embed step is intentionally flaky to exercise retry/backoff; persisted",
    "chunks would normally be queryable as vectors. Configure a provider in",
    "Settings to generate a live, model-written summary instead.",
  ].join(" ");
}

// Resolve a Vercel AI SDK model instance for the visitor's saved provider/key.
// `dangerouslyAllowBrowser` is intentional: the whole BYOK design is a direct
// browser -> provider call using the visitor's own credentials.
function resolveModel(byok: Byok) {
  switch (byok.provider) {
    case "anthropic":
      return createAnthropic({
        apiKey: byok.apiKey,
        headers: { "anthropic-dangerous-direct-browser-access": "true" },
      })(byok.model);
    case "openai":
      return createOpenAI({ apiKey: byok.apiKey })(byok.model);
    case "google":
      return createGoogleGenerativeAI({ apiKey: byok.apiKey })(byok.model);
    default:
      throw new Error(`Unsupported provider: ${byok.provider}`);
  }
}

export async function generateInsight(
  byok: Byok,
  prompt: string
): Promise<string> {
  if (byok.provider === "mock") {
    return deterministicMock(prompt);
  }
  const { text } = await generateText({
    model: resolveModel(byok),
    prompt,
  });
  return text;
}
