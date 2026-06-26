# PageAlign CRO

AI-powered conversion-rate-optimization (CRO) tool for D2C / e-commerce landing pages. Give it a product page URL, your target audience/vision, and your ad creative (screenshot or copy) — it scrapes the page, runs iterative CRO refinement loops with Gemini, and returns optimized section-by-section copy plus a fully rebuilt, personalized HTML page you can preview live.

## What it does

1. **Scrape** — fetches the target landing page via Firecrawl (falls back to an AI-generated mock blueprint if no `FIRECRAWL_API_KEY` is set).
2. **Map** — segments the page into core e-commerce blocks (hero, social proof, benefits, FAQ, offer/CTA).
3. **Optimize (loop)** — runs 5–10 sequential refinement passes through Gemini, each building on the previous change log, aligning copy to the ad "scent" and audience vision while preserving product facts.
4. **Render** — returns optimized sections (with before/after + justification), a change-log ledger, and a complete Tailwind-styled `enhanced_html` page rendered in a live side-by-side iframe preview (with a fullscreen sandbox).

## Stack

- **Framework** — Next.js 15 (App Router) + React 19
- **AI** — Google Gemini via `@google/genai`
- **Scraping** — Firecrawl REST API (v1), optional
- **UI** — Tailwind CSS v4, Motion, lucide-react

## Routes

- `POST /api/personalize` — runs the scrape + optimization loop. See [DESIGN.md](DESIGN.md) for the request/response schema.
- `GET /api/config` — reports which API keys are present (so the UI can show scraper status) without exposing the values.

## Run locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and set your keys:
   ```
   GEMINI_API_KEY=your_gemini_key
   # optional — enables live scraping instead of the mock fallback:
   FIRECRAWL_API_KEY=your_firecrawl_key
   ```
   (`EXTERNAL_GEMINI_API_KEY` is also honored and takes precedence over `GEMINI_API_KEY`.)
3. Run the dev server:
   ```bash
   npm run dev
   ```

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes* | Gemini API credentials for the CRO engine |
| `EXTERNAL_GEMINI_API_KEY` | No | Alternative Gemini key; takes precedence if set |
| `FIRECRAWL_API_KEY` | No | Enables live page scraping; without it, a mock page blueprint is generated |

\* Either `GEMINI_API_KEY` or `EXTERNAL_GEMINI_API_KEY` must be set.
