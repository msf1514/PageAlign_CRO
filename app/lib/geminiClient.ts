// Path: app/lib/geminiClient.ts

import { GoogleGenAI } from "@google/genai";

/**
 * The Gemini model used across the CRO engine. Overridable via the GEMINI_MODEL
 * env var so the model can be swapped without code changes.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

/**
 * Collects and de-duplicates Gemini API keys from the environment.
 * Accepts comma-separated lists in the *_KEYS vars and stays backward
 * compatible with the original single-key var names. Precedence:
 * EXTERNAL_GEMINI_API_KEYS, GEMINI_API_KEYS, EXTERNAL_GEMINI_API_KEY, GEMINI_API_KEY.
 */
export function getGeminiKeys(): string[] {
  const raw = [
    process.env.EXTERNAL_GEMINI_API_KEYS,
    process.env.GEMINI_API_KEYS,
    process.env.EXTERNAL_GEMINI_API_KEY,
    process.env.GEMINI_API_KEY,
  ]
    .filter(Boolean)
    .join(",");

  return [...new Set(raw.split(",").map((k) => k.trim()).filter(Boolean))];
}

/**
 * Whether an error is worth retrying against a different key (rate limit, quota
 * exhaustion, auth rejection on one key, or transient upstream 5xx/overload).
 */
export function isRetryableKeyError(err: unknown): boolean {
  const e = err as { status?: number; code?: number; response?: { status?: number }; message?: string };
  const status = e?.status ?? e?.code ?? e?.response?.status;
  if (status === 429 || status === 403 || status === 401) return true;
  if (typeof status === "number" && status >= 500 && status < 600) return true;

  const msg = String(e?.message || "").toLowerCase();
  return /quota|rate.?limit|resource has been exhausted|exhausted|too many requests|overloaded|unavailable|permission|api key/.test(
    msg
  );
}

export type GenerateFn = (request: Parameters<GoogleGenAI["models"]["generateContent"]>[0]) => Promise<Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>>;

/**
 * Builds a `generateContent` function that rotates through the provided keys.
 * It remembers the last working key (cursor) so subsequent calls in a long loop
 * don't repeatedly waste a failed request on an already-exhausted key.
 */
export function createGeminiRotator(keys: string[]): GenerateFn {
  if (!keys.length) {
    throw new Error(
      "No Gemini API key configured. Set GEMINI_API_KEYS (comma-separated) or GEMINI_API_KEY / EXTERNAL_GEMINI_API_KEY in your environment."
    );
  }

  let cursor = 0;

  return async function generate(request) {
    let lastErr: unknown;
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const idx = (cursor + attempt) % keys.length;
      try {
        const ai = new GoogleGenAI({
          apiKey: keys[idx],
          httpOptions: { headers: { "User-Agent": "aistudio-build" } },
        });
        const res = await ai.models.generateContent(request);
        cursor = idx; // stick with this key for the next call
        return res;
      } catch (err) {
        lastErr = err;
        if (!isRetryableKeyError(err) || attempt === keys.length - 1) throw err;
        console.warn(
          `Gemini key #${idx + 1} of ${keys.length} failed (${(err as { message?: string })?.message || err}); rotating to next key.`
        );
      }
    }
    throw lastErr;
  };
}
