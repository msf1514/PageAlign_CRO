// Path: app/lib/llm.ts
//
// Multi-provider LLM layer with prioritized fallback. The CRO engine calls a
// single generate() that returns { text }. Internally it tries providers in
// priority order (default: Gemini -> OpenRouter free models) and falls back on
// overload / rate-limit / quota / transient errors — so a Gemini 503 ("high
// demand") no longer breaks the site.
//
// It accepts the SAME Gemini-style request the engine already builds
// ({ model, contents, config }), translating it to each provider's API.

import { GoogleGenAI } from "@google/genai";
import {
  GEMINI_MODEL,
  getGeminiKeys,
  createGeminiRotator,
  isRetryableKeyError,
} from "./geminiClient";

export interface LLMResult {
  text: string;
  provider: string;
  model: string;
}

type GeminiRequest = Parameters<GoogleGenAI["models"]["generateContent"]>[0];
export type LLMGenerate = (request: GeminiRequest) => Promise<LLMResult>;

// ─── Configuration (env-driven) ──────────────────────────────────────────────

/** Provider priority, e.g. "gemini,openrouter". */
function getProviderPriority(): string[] {
  const raw = process.env.LLM_PROVIDER_PRIORITY || "gemini,openrouter";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** OpenRouter API keys (comma-separated; rotates on failure). */
export function getOpenRouterKeys(): string[] {
  const raw = [process.env.OPENROUTER_API_KEYS, process.env.OPENROUTER_API_KEY]
    .filter(Boolean)
    .join(",");
  return [...new Set(raw.split(",").map((k) => k.trim()).filter(Boolean))];
}

/** Free OpenRouter models to try, in order. Override with OPENROUTER_MODELS. */
function getOpenRouterModels(): string[] {
  const raw =
    process.env.OPENROUTER_MODELS ||
    "google/gemini-2.0-flash-exp:free,meta-llama/llama-3.3-70b-instruct:free,deepseek/deepseek-chat-v3-0324:free";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function hasAnyProviderConfigured(): boolean {
  return getGeminiKeys().length > 0 || getOpenRouterKeys().length > 0;
}

// ─── Gemini request -> OpenRouter (OpenAI-compatible) translation ─────────────

interface ORMessage {
  role: "system" | "user";
  content: unknown;
}

function geminiRequestToOpenRouter(request: GeminiRequest): {
  messages: ORMessage[];
  wantsJson: boolean;
  temperature?: number;
  maxTokens?: number;
} {
  // The engine builds well-typed Gemini requests; read fields loosely here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = request as any;
  const system: string | undefined = r?.config?.systemInstruction;
  const contents = r?.contents;
  const wantsJson = r?.config?.responseMimeType === "application/json";

  // Build the user message content (string, or an array supporting images).
  let userContent: unknown = "";
  if (typeof contents === "string") {
    userContent = contents;
  } else if (contents?.parts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const part of contents.parts as any[]) {
      if (part?.text) {
        arr.push({ type: "text", text: part.text });
      } else if (part?.inlineData) {
        arr.push({
          type: "image_url",
          image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` },
        });
      }
    }
    userContent = arr.length === 1 && arr[0].type === "text" ? arr[0].text : arr;
  }

  let sys = system || "";
  if (wantsJson) {
    sys +=
      "\n\nRespond with ONLY a single valid JSON object — no markdown fences, no prose.";
    if (r?.config?.responseSchema) {
      sys += " The JSON must conform to this schema:\n" + JSON.stringify(r.config.responseSchema);
    }
  }

  const messages: ORMessage[] = [];
  if (sys.trim()) messages.push({ role: "system", content: sys });
  messages.push({ role: "user", content: userContent });

  return {
    messages,
    wantsJson,
    temperature: typeof r?.config?.temperature === "number" ? r.config.temperature : undefined,
    maxTokens: typeof r?.config?.maxOutputTokens === "number" ? r.config.maxOutputTokens : undefined,
  };
}

async function tryOpenRouter(request: GeminiRequest): Promise<LLMResult> {
  const keys = getOpenRouterKeys();
  if (!keys.length) throw new Error("OpenRouter not configured (set OPENROUTER_API_KEY).");

  const models = getOpenRouterModels();
  const { messages, wantsJson, temperature, maxTokens } = geminiRequestToOpenRouter(request);

  let lastErr: unknown;
  for (const model of models) {
    for (const key of keys) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = { model, messages };
        if (wantsJson) body.response_format = { type: "json_object" };
        if (typeof temperature === "number") body.temperature = temperature;
        if (typeof maxTokens === "number") body.max_tokens = maxTokens;

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.APP_URL || "https://pagealign.app",
            "X-Title": "PageAlign CRO",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          const err = new Error(`OpenRouter ${model} -> HTTP ${res.status}: ${errText.slice(0, 200)}`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (err as any).status = res.status;
          throw err;
        }

        const data = await res.json();
        const text: string = data?.choices?.[0]?.message?.content ?? "";
        if (!text) throw new Error(`OpenRouter ${model} returned empty content.`);
        return { text, provider: "openrouter", model };
      } catch (err) {
        lastErr = err;
        console.warn(
          `OpenRouter model '${model}' failed (${(err as { message?: string })?.message || err}); trying next.`
        );
      }
    }
  }
  throw lastErr || new Error("All OpenRouter models failed.");
}

// ─── Public factory ──────────────────────────────────────────────────────────

/**
 * Builds a generate() that tries each configured provider in priority order,
 * falling back on overload / quota / transient errors. Within Gemini it also
 * rotates API keys. Returns a uniform { text, provider, model }.
 */
export function createLLMGenerator(): LLMGenerate {
  const geminiKeys = getGeminiKeys();
  const geminiRotator = geminiKeys.length ? createGeminiRotator(geminiKeys) : null;
  const providers = getProviderPriority();

  return async function generate(request: GeminiRequest): Promise<LLMResult> {
    let lastErr: unknown;

    for (const provider of providers) {
      try {
        if (provider === "gemini") {
          if (!geminiRotator) continue;
          const res = await geminiRotator(request);
          return {
            text: res.text ?? "",
            provider: "gemini",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            model: (request as any)?.model || GEMINI_MODEL,
          };
        }
        if (provider === "openrouter") {
          if (!getOpenRouterKeys().length) continue;
          return await tryOpenRouter(request);
        }
      } catch (err) {
        lastErr = err;
        const retryable = isRetryableKeyError(err);
        console.warn(
          `LLM provider '${provider}' failed${retryable ? " (retryable)" : ""}: ${
            (err as { message?: string })?.message || err
          }; falling back to next provider.`
        );
        // Try the next provider regardless — resilience is the goal.
      }
    }

    throw lastErr || new Error("No LLM provider is configured. Set GEMINI_API_KEYS or OPENROUTER_API_KEY.");
  };
}
