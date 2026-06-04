# PageAlign CRO Architecture & Design Manual
// Path: DESIGN.md

This document serves as the persistent context anchor and structural reference mapping the routing structures, JSON schemas, and backend engines.

---

## 1. System Routes & Interface Architecture

### API Endpoint: `/api/personalize` (POST)
Processes landing page optimization requests in iterative cycles using Gemini models.

- **Request Payload Structure (`NextRequest` body):**
  - `url` (string): Target landing page url to process or simulate scanning.
  - `audience` (string): Human-targeted segment overview (e.g., "Google ads traffic seeking high quality widgets").
  - `adCreative` (string, optional): Specific ad copy to align page scent with.
  - `userVision` (string, optional): Extra accessibility or visual requests.
  - `adImage` (string, optional): Base64-encoded screenshot of the ad creative.

- **Success Return Payload Schema:**
  ```json
  {
    "status": "success",
    "iteration": 1,
    "mode": "optimized",
    "confidence_score": 95,
    "global_adjustments": {
      "overall_strategy_summary": "Sync heading hooks directly to visual keywords..."
    },
    "sections_optimized": [
      {
        "section_id": "hero",
        "rationale": "Perfect scent alignment with the promotional image..."
      }
    ],
    "change_log_summary": "Updated Hero text and modernized benefits copy...",
    "enhanced_html": "<!DOCTYPE html><html>...</html>"
  }
  ```

---

## 2. Environment Variables (`.env.example`)

- `GEMINI_API_KEY`: Primary AI engine credentials.
- `FIRECRAWL_API_KEY`: Optional. Used to scrape live webpage content instead of falls backups.

---

## 3. Responsive Viewports & Fullscreen Sandbox View
To prevent layout warping on large, widescreen, or fullscreen displays:
- The **Interactive Desktop Preview** viewport (`#mock-device-viewport`) implements a rigid `aspect-[16/10.5]` constraint paired with a mobile fallback of `min-h-[420px]`.
- A **CRO Live-Site Fullscreen Viewport** sandbox modal can be toggled without consuming model tokens or triggering supplementary scraping/API procedures.
- The fullscreen sandbox state supports dynamic **Fixed Aspect Ratio (16:10.5)** rendering to safeguard pixel accuracy, as well as **Responsive Stretch (Fluid)** rendering for authentic desktop fluidity.


