# PageAlign CRO Architecture & Design Manual
// Path: DESIGN.md

This document is the persistent context anchor and structural reference mapping the routes, JSON schemas, and the optimization engine. It is kept in sync with the actual code.

---

## 1. System Routes & Interface Architecture

### API Endpoint: `POST /api/personalize`
Processes a landing-page optimization request through a two-phase Gemini pipeline (see §4).

- **Request payload (JSON body).** Each field accepts a primary key and a legacy alias:
  - `target_url` *(or `url`)* — **required.** Target landing page URL to scrape or simulate.
  - `user_vision_or_audience` *(or `vision`)* — **required.** Target segment / tone / accessibility requests.
  - `ad_creative` *(or `adCreative`)* — optional. Ad copy text to align page scent with.
  - `ad_image` *(or `adImage`)* — optional. Base64 data URL (`data:image/...;base64,...`) of the ad screenshot for multimodal analysis.
  - `max_loops` *(or `maxLoops`)* — optional. Refinement passes, clamped to **5–10** (defaults to 5).

- **Success response (HTTP 200):**
  ```json
  {
    "success": true,
    "original_source_is_mocked": false,
    "firecrawl_key_detected": true,
    "scrape_method": "firecrawl_live",          // or "mock_fallback"
    "scraped_text_preview": "First 1500 chars of the scraped content...",

    "status": "success",
    "iteration": 5,                              // actual copy loops run (early-stop aware)
    "mode": "universal_cro_enhanced",
    "confidence_score": 0.95,                    // 0–1 fraction (UI normalizes either scale)
    "global_adjustments": {
      "contrast_enhancements": "Accessibility/contrast adjustments made, if any.",
      "overall_tone_applied": "Description of the copy angle used."
    },
    "sections_optimized": [
      {
        "section_type": "hero",
        "original_text_snippet": "Original text found in scrape",
        "optimized_text": "High-converting rewritten text",
        "cro_justification": "Why this converts better for the target audience"
      }
    ],
    "change_log_summary": "Bulleted summary of what improved across the passes.",
    "enhanced_html": "<!DOCTYPE html><html>...full personalized Tailwind page...</html>"
  }
  ```

- **Error response:** `{ "status": "error", "message": "..." }` with HTTP 400 (missing `target_url` / `user_vision_or_audience`) or 500 (engine failure).

- **Runtime:** `runtime = "nodejs"`, `maxDuration = 60`. The handler runs several sequential Gemini calls; on Vercel Hobby the cap is 60s, raise `maxDuration` to 300 on Pro for 10-loop runs.

### API Endpoint: `GET /api/config`
Reports which secrets are present (masked booleans only — never the values), so the UI can show scraper/model status.
```json
{
  "hasFirecrawlKey": true,
  "hasGeminiKey": true,
  "hasExternalGeminiKey": false,
  "geminiKeyCount": 3
}
```

---

## 2. Environment Variables

See [.env.example](.env.example).

- `GEMINI_API_KEYS` — **required.** One or more comma-separated Gemini keys. With multiple keys the engine rotates to the next on rate-limit/quota errors (see §3). Legacy single-key names are still honored, with precedence: `EXTERNAL_GEMINI_API_KEYS` > `GEMINI_API_KEYS` > `EXTERNAL_GEMINI_API_KEY` > `GEMINI_API_KEY`.
- `GEMINI_MODEL` — optional. Overrides the model id (default `gemini-3.5-flash`; `gemini-2.5-flash` is a solid alternative).
- `FIRECRAWL_API_KEY` — optional. Enables live scraping via the Firecrawl **v1** API; without it the engine generates a mock page blueprint.
- `APP_URL` — optional.

---

## 3. Gemini Key Rotation (`app/lib/geminiClient.ts`)

- `getGeminiKeys()` collects + de-duplicates keys from the env vars above.
- `createGeminiRotator(keys)` returns a `generate()` function used for every model call. On a retryable error (HTTP 429/403/401, 5xx, or quota/rate-limit/overload messages) it rotates to the next key, and it remembers the last working key (cursor) so a long loop doesn't repeatedly hit an exhausted key.
- `GEMINI_MODEL` is the single source of truth for the model id.

---

## 4. Optimization Pipeline (`app/api/personalize/route.ts`)

Two-phase design — iterate cheaply on copy, render the heavy HTML only once:

- **Step A — Scrape.** Firecrawl v1 (`POST https://api.firecrawl.dev/v1/scrape`, `formats: ["markdown","html"]`, `onlyMainContent: true`) when `FIRECRAWL_API_KEY` is set; otherwise `generateMockScrape()` produces a realistic Markdown blueprint via Gemini.
- **Phase 1 — Copy refinement (cheap, no HTML).** Runs up to `max_loops` passes against `copyResponseSchema` (sections, tone/contrast, change log, confidence, plus a `needs_more_refinement` flag). Each pass receives the *current* sections and refines them rather than starting over.
  - **Early-stop:** the loop breaks once the model sets `needs_more_refinement: false` or confidence ≥ 92%, saving tokens on easy pages.
- **Phase 2 — Render once.** A single call builds the full Tailwind `enhanced_html` from the final optimized copy, returned as raw HTML.
- **Phase 3 — Polish once.** One self-critique pass tightens layout/contrast/responsiveness. A length guard prevents a bad polish from clobbering a good render.

This replaced an earlier loop that regenerated the entire HTML on every pass and discarded all but the last — the new flow produces ~2 HTML generations total regardless of loop count.

### Agent behavior
The system prompt ([app/lib/croAgentPrompt.ts](app/lib/croAgentPrompt.ts)) enforces product fidelity (never invent specs/options/prices), brand preservation, a 5–11 word hero title, and accessibility/contrast handling on request.

---

## 5. Responsive Viewports & Fullscreen Sandbox

- The **Interactive Desktop Preview** (`#mock-device-viewport`) uses a rigid `aspect-[16/10.5]` constraint with a `min-h-[420px]` mobile fallback to prevent layout warping.
- A **CRO Live-Site Fullscreen Viewport** modal renders the generated `enhanced_html` in an iframe (`sandbox="allow-scripts"`) without consuming model tokens or re-scraping.
- Fullscreen supports **Fixed Aspect Ratio (16:10.5)** for pixel accuracy and **Responsive Stretch (Fluid)** for authentic desktop fluidity.
