// Path: app/api/personalize/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { CRO_AGENT_SYSTEM_PROMPT } from "@/app/lib/croAgentPrompt";
import { GEMINI_MODEL } from "@/app/lib/geminiClient";
import { createLLMGenerator, hasAnyProviderConfigured, type LLMGenerate } from "@/app/lib/llm";

// This handler runs 5–10 sequential Gemini calls, each generating a full HTML
// page, so it needs Node runtime and a long timeout. (Vercel caps maxDuration
// at 60s on Hobby; raise to 300 on Pro for 10-loop runs.)
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Helper delay function to avoid rate-limiting triggers between nested loop passes.
 * @param ms Frequency delay in milliseconds
 * @returns Simple promise execution resolver
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strips markdown code fences (```html ... ```) the model sometimes wraps raw
 * HTML output in, and trims surrounding whitespace.
 */
function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:html|HTML)?\s*/, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

/**
 * Dynamically simulates a page retrieve scrape of a target e-commerce URL in Markdown
 * when no Firecrawl API credentials are provided or if their validation fails.
 * @param generate Key-rotating Gemini generate function
 * @param url Target URL to inspect/simulate
 * @param audience Custom user objective or segment description to adapt mock tags
 * @returns Clean Markdown e-commerce page blueprint
 */
async function generateMockScrape(generate: LLMGenerate, url: string, audience: string): Promise<string> {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    const brandName = domain.split(".")[0].toUpperCase() || "D2C Brand";

    const prompt = `
      Create a realistic Markdown representation of a standard, elite e-commerce layout for a product detail or landing page.
      Reference the brand domain '${brandName}' (derived from '${url}'), and general targeting context: '${audience}'.
      Include the following explicit page sections:
      1. Hero Section: Headline, value-driven subhead, rating badge, and main 'Add to Cart' or 'Buy Now' button.
      2. Social Proof Section: 2 high-quality customer reviews with names.
      3. Features & Benefits: 3 specific technical features translated to customer-focused outcomes.
      4. FAQ Section: 2 conversion questions and answers (e.g. shipping time, money back guarantee).
      5. Offer / CTA block: Action button, pricing details ($49.90, free shipping over $50) and risk reduction copy.

      Do NOT invent options that deviate from a standard premium brand. Maintain realistic e-commerce copywriting.
    `;

    const response = await generate({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: "You are an e-commerce inspector and page retriever returning high-quality markdown snapshots.",
      },
    });
    const responseText = response.text || "";

    return responseText || `# ${brandName} Product Page\nFailed to fully render. Please set FIRECRAWL_API_KEY.`;
  } catch (error) {
    console.error("Error generating mock scrape:", error);
    return `# Scrape Simulation\nCould not fetch domain metadata. Fallback content structure populated.`;
  }
}

/**
 * Main POST handler executing scraping operations and nested AI agent-driven optimization loops.
 * @param req Standard Next.js server-side HTTP request wrapper
 * @returns JSON response containing optimization metadata, global adjustments, section listings, and change log summaries
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetUrl = body.target_url || body.url;
    const userVision = body.user_vision_or_audience || body.vision;
    const adCreative = body.ad_creative || body.adCreative || "";
    const adImageBase64 = body.ad_image || body.adImage || "";
    
    // Multi-provider generator: tries Gemini (rotating keys), then falls back to
    // OpenRouter free models on overload / quota / transient errors.
    if (!hasAnyProviderConfigured()) {
      throw new Error(
        "No AI provider configured. Set GEMINI_API_KEYS (or GEMINI_API_KEY) and/or OPENROUTER_API_KEY."
      );
    }
    const generate = createLLMGenerator();
    
    // Bounds guard: Limit max loops strictly between 5 and 10 to satisfy constraint
    let maxLoops = parseInt(body.max_loops || body.maxLoops || "5", 10);
    if (isNaN(maxLoops) || maxLoops < 5) {
      maxLoops = 5;
    } else if (maxLoops > 10) {
      maxLoops = 10;
    }

    if (!targetUrl) {
      return NextResponse.json(
        { status: "error", message: "Missing required 'target_url' property in JSON payload." },
        { status: 400 }
      );
    }

    if (!userVision) {
      return NextResponse.json(
        { status: "error", message: "Missing required 'user_vision_or_audience' property." },
        { status: 400 }
      );
    }

    // Parse uploaded ad creative image screenshot if present
    let adImagePart: any = null;
    if (adImageBase64) {
      try {
        const match = adImageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          adImagePart = {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          };
        } else {
          // If pure base64 without data prefix
          adImagePart = {
            inlineData: {
              mimeType: "image/png",
              data: adImageBase64,
            },
          };
        }
      } catch (err) {
        console.error("Failed to parse ad creative image base64:", err);
      }
    }

    // STEP A: Firecrawl Scrape / Mock Retrieval
    let scrapedContent = "";
    let isMocked = false;

    if (process.env.FIRECRAWL_API_KEY) {
      try {
        const firecrawlRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          },
          body: JSON.stringify({
            url: targetUrl,
            formats: ["markdown", "html"],
            onlyMainContent: true,
          }),
        });

        if (firecrawlRes.ok) {
          const fcData = await firecrawlRes.json();
          // v1 returns { success, data: { markdown, html, ... } }
          scrapedContent = fcData.data?.markdown || fcData.data?.html || "";
        } else {
          console.error("Firecrawl v1 scrape returned non-OK status:", firecrawlRes.status);
        }
      } catch (err) {
        console.error("Firecrawl request error, executing fallback scrape:", err);
      }
    }

    if (!scrapedContent) {
      scrapedContent = await generateMockScrape(generate, targetUrl, userVision);
      isMocked = true;
    }

    // STEP B: Two-phase optimization.
    // Phase 1 iterates on COPY only (cheap, no HTML). Phase 2 renders the full
    // HTML once. Phase 3 runs a single polish pass. This replaces the old
    // approach that regenerated the entire HTML on every loop and discarded all
    // but the last — far fewer expensive HTML generations for the same result.

    // Schema for the cheap copy-only iterations (no enhanced_html).
    const copyResponseSchema = {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING },
        iteration: { type: Type.INTEGER },
        mode: { type: Type.STRING },
        confidence_score: { type: Type.NUMBER },
        needs_more_refinement: { type: Type.BOOLEAN },
        global_adjustments: {
          type: Type.OBJECT,
          properties: {
            contrast_enhancements: { type: Type.STRING },
            overall_tone_applied: { type: Type.STRING },
          },
          required: ["contrast_enhancements", "overall_tone_applied"],
        },
        sections_optimized: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              section_type: { type: Type.STRING },
              original_text_snippet: { type: Type.STRING },
              optimized_text: { type: Type.STRING },
              cro_justification: { type: Type.STRING },
            },
            required: [
              "section_type",
              "original_text_snippet",
              "optimized_text",
              "cro_justification",
            ],
          },
        },
        change_log_summary: { type: Type.STRING },
      },
      required: [
        "status",
        "iteration",
        "mode",
        "confidence_score",
        "needs_more_refinement",
        "global_adjustments",
        "sections_optimized",
        "change_log_summary",
      ],
    };

    // Time budget so the function returns a result BEFORE the platform timeout
    // (Vercel killed this at 60s -> 504) instead of dying mid-run. Scales with
    // maxDuration: on Pro (maxDuration=300) more copy passes run; on Hobby (60s)
    // it stops copy early and still renders the page. We reserve time for the
    // (slow) HTML render so it always completes.
    const startedAt = Date.now();
    const softBudgetMs = Math.max(20_000, (maxDuration - 8) * 1000);
    const renderReserveMs = 24_000;
    const copyDeadline = startedAt + Math.max(12_000, softBudgetMs - renderReserveMs);

    // ── PHASE 1: Iterative COPY refinement (cheap, no HTML) ──────────────────
    let copyState: any = null;
    let previousChangeLog = "";
    let loopsRun = 0;

    for (let loopIndex = 1; loopIndex <= maxLoops; loopIndex++) {
      // Stop adding copy passes once the time budget is spent (keep ≥1 pass),
      // leaving room for the render so we don't hit the function timeout.
      if (loopIndex > 1 && Date.now() > copyDeadline) {
        console.warn(`Stopping copy loop early at pass ${loopIndex} (time budget reached).`);
        break;
      }

      // Rate-limit backoff window to minimize 429 errors.
      await sleep(220);

      const promptParts: any[] = [];
      if (adImagePart) {
        promptParts.push(adImagePart);
      }

      promptParts.push({
        text: `
          ### COPY REFINEMENT CYCLE ${loopIndex} OF ${maxLoops} ###

          [Scraped Data / Base Landing Page Content]:
          ${scrapedContent}

          [Ad Creative / Ad Copy text (if manual)]:
          ${adCreative || "None provided in text. Please analyze visual elements and text from the attached ad screenshot to match the ad scent!"}

          [User Vision / Audience targeting / Accessibility requests]:
          ${userVision}

          [Iteration Count]:
          ${loopIndex}

          [Previous Changes Log]:
          ${previousChangeLog || "No previous passes have occurred."}

          [Current Optimized Sections So Far (refine these — do NOT start over)]:
          ${copyState ? JSON.stringify(copyState.sections_optimized, null, 2) : "None yet — produce the first optimization pass."}

          Analyze and refine the CONVERSION COPY only. Do NOT generate any HTML in this phase.
          CRITICAL RULES:
          1. The [User Vision / Audience] is a PRIMARY driver: tailor tone, vocabulary, which benefits you lead with, the objections you pre-empt, social-proof selection, and CTA wording to this specific audience. The ad creative sets the "scent"; the audience sets the voice and priorities — honor both.
          2. Keep the optimized Hero Heading/Title punchy and human-written: strictly 5 to 11 words (approx. 45 to 70 characters max), matching the hook/angle of the [Ad Creative].
          3. Personalize copy for the EXISTING sections — do NOT invent whole new page sections here; the page structure must stay close to the original. Build on [Current Optimized Sections So Far]; never discard good prior copy. Cover hero, social proof, features/benefits, FAQ, and offer/CTA where present.
          4. In each section's "cro_justification", briefly state how the change serves the target audience.
          5. Set "needs_more_refinement" to false once the copy is well-optimized and further passes would yield no meaningful gains (this lets the loop stop early and save tokens).

          Format your response strictly according to the requested JSON response schema.
        `
      });

      const response = await generate({
        model: GEMINI_MODEL,
        contents: { parts: promptParts },
        config: {
          systemInstruction: CRO_AGENT_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: copyResponseSchema,
        },
      });
      const responseText = response.text || "";

      if (!responseText) {
        if (copyState) break; // keep best-effort prior state
        throw new Error(`Empty response returned from Gemini API on copy cycle ${loopIndex}`);
      }

      try {
        const parsed = JSON.parse(responseText.trim());
        parsed.iteration = loopIndex;
        copyState = parsed;
        previousChangeLog = parsed.change_log_summary || previousChangeLog;
        loopsRun = loopIndex;
      } catch (parseError) {
        console.error("Copy JSON parse warning on pass:", loopIndex, parseError);
        if (!copyState) {
          throw new Error("Unable to establish a base compliant JSON optimization from the CRO copy loop.");
        }
      }

      // Early-stop: model signals it's done, or confidence is already high.
      const conf = typeof copyState?.confidence_score === "number" ? copyState.confidence_score : 0;
      const confPct = conf <= 1 ? conf * 100 : conf;
      if (copyState?.needs_more_refinement === false || confPct >= 92) {
        break;
      }
    }

    if (!copyState) {
      throw new Error("CRO copy optimization produced no usable result.");
    }

    // ── PHASE 2: Render the full HTML ONCE from the final copy ───────────────
    const renderParts: any[] = [];
    if (adImagePart) {
      renderParts.push(adImagePart);
    }
    renderParts.push({
      text: `
        Build the FINAL personalized landing page as a single, complete HTML document.

        [Scraped Data / Base Landing Page Content]:
        ${scrapedContent}

        [Final Optimized Copy (apply these exactly)]:
        ${JSON.stringify(copyState.sections_optimized, null, 2)}

        [Global Adjustments / Tone & Contrast]:
        ${JSON.stringify(copyState.global_adjustments, null, 2)}

        [User Vision / Audience / Accessibility]:
        ${userVision}

        REQUIREMENTS:
        - Output ONLY raw HTML (no markdown, no code fences, no commentary). Start with <!DOCTYPE html>. Style with Tailwind via <script src="https://cdn.tailwindcss.com"></script>.
        - THIS IS A PERSONALIZATION, NOT A REDESIGN. Stay faithful to the original page:
          • Keep the original section ORDER and overall layout/structure from [Scraped Data]. Do not reorder, drop, or wholesale-restructure sections, and do not impose a different design language.
          • Reuse the brand's EXISTING colour palette and visual tone. Infer the brand's primary / accent / background colours from the brand identity, logo, the scraped data, and the ad creative, and stick to them — do NOT introduce a new colour scheme or restyle the brand.
          • Match the original's typographic feel and spacing rather than "upgrading" it.
        - Replace the copy with [Final Optimized Copy]. You MAY add only a FEW audience-relevant elements (e.g. a trust badge, a reassurance / guarantee line, one relevant FAQ) when they fit naturally and serve [User Vision / Audience] — never revamp the page.
        - IMAGES: Use ONLY image URLs that appear VERBATIM in [Scraped Data]; never invent, guess, shorten or modify a URL, and never use placeholder-image services. Scraped images are often hotlink-protected and will 404 inside the iframe, so for large hero / banner / background areas use a CSS background in the BRAND'S colours instead of an external image. Use real scraped URLs only for small inline product shots / logos, and never render a broken-image placeholder.
        - Apply only the accessibility / contrast adjustments explicitly requested in [User Vision]. It renders inside an iframe for live comparison.
      `
    });

    const renderResponse = await generate({
      model: GEMINI_MODEL,
      contents: { parts: renderParts },
      config: { systemInstruction: CRO_AGENT_SYSTEM_PROMPT },
    });
    let enhancedHtml = stripCodeFences(renderResponse.text || "");

    // ── PHASE 3: Optional polish pass over the rendered HTML ─────────────────
    // OFF by default: rewriting the whole page blind tended to corrupt image
    // URLs (broken images) and adds a slow call. Re-enable with ENABLE_POLISH=true.
    const enablePolish = process.env.ENABLE_POLISH === "true";
    const timeForPolish = Date.now() < startedAt + softBudgetMs - 14_000;
    if (enablePolish && enhancedHtml && timeForPolish) {
      try {
        await sleep(220);
        const polishResponse = await generate({
          model: GEMINI_MODEL,
          contents: `
            You are a senior conversion-focused front-end engineer. Improve the landing page below WITHOUT changing product facts, prices, or the meaning of the copy.
            Tighten layout, spacing, visual hierarchy, contrast/accessibility, and mobile responsiveness. Ensure valid, self-contained HTML using the Tailwind CDN.
            CRITICAL: Preserve every image URL / src and every background EXACTLY as-is — never replace, remove, alter, or substitute placeholder images. Do not introduce any new external image URLs.

            [Audience / Vision]: ${userVision}

            Output ONLY the improved raw HTML (no markdown, no code fences, no commentary). Start with <!DOCTYPE html>.

            [Current HTML]:
            ${enhancedHtml}
          `,
          config: {},
        });
        const polished = stripCodeFences(polishResponse.text || "");
        // Guard against a truncated/empty polish result clobbering a good render.
        if (polished && polished.length > 200) {
          enhancedHtml = polished;
        }
      } catch (polishErr) {
        console.error("HTML polish pass failed; using pre-polish render:", polishErr);
      }
    }

    const finalPayload: any = {
      status: "success",
      iteration: loopsRun,
      mode: copyState.mode || "universal_cro_enhanced",
      confidence_score: copyState.confidence_score,
      global_adjustments: copyState.global_adjustments,
      sections_optimized: copyState.sections_optimized,
      change_log_summary: copyState.change_log_summary,
      enhanced_html: enhancedHtml,
    };

    const firecrawlKeyDetected = !!process.env.FIRECRAWL_API_KEY;
    const scrapeMethod = isMocked ? "mock_fallback" : "firecrawl_live";

    return NextResponse.json({
      success: true,
      original_source_is_mocked: isMocked,
      firecrawl_key_detected: firecrawlKeyDetected,
      scrape_method: scrapeMethod,
      scraped_text_preview: scrapedContent.substring(0, 1500),
      ...finalPayload,
    });
  } catch (err: any) {
    console.error("CRO Processing Failure:", err);
    return NextResponse.json(
      {
        status: "error",
        message: err.message || "An unresolved internal server error occurred within the CRO agent pipeline.",
      },
      { status: 500 }
    );
  }
}
