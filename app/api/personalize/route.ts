// Path: app/api/personalize/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { CRO_AGENT_SYSTEM_PROMPT } from "@/app/lib/croAgentPrompt";

/**
 * Initializes the GoogleGenAI SDK with the server-side API key and User-Agent telemetry context.
 */
function getAiClient(): GoogleGenAI {
  const apiKey = process.env.EXTERNAL_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "The server-side EXTERNAL_GEMINI_API_KEY environment variable is missing. Please add your API key in the application's Secret Key settings as EXTERNAL_GEMINI_API_KEY."
    );
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

/**
 * Helper delay function to avoid rate-limiting triggers between nested loop passes.
 * @param ms Frequency delay in milliseconds
 * @returns Simple promise execution resolver
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dynamically simulates a page retrieve scrape of a target e-commerce URL in Markdown
 * when no Firecrawl API credentials are provided or if their validation fails.
 * @param aiClient Configured parent GoogleGenAI engine
 * @param url Target URL to inspect/simulate
 * @param audience Custom user objective or segment description to adapt mock tags
 * @returns Clean Markdown e-commerce page blueprint
 */
async function generateMockScrape(aiClient: GoogleGenAI, url: string, audience: string): Promise<string> {
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

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
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
    
    // Dynamically retrieve the configured GoogleGenAI agent client
    const aiClient = getAiClient();
    
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
        const firecrawlRes = await fetch("https://api.firecrawl.dev/v0/scrape", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          },
          body: JSON.stringify({
            url: targetUrl,
            pageOptions: {
              onlyMainContent: true,
            },
          }),
        });

        if (firecrawlRes.ok) {
          const fcData = await firecrawlRes.json();
          scrapedContent = fcData.data?.markdown || fcData.data?.html || "";
        }
      } catch (err) {
        console.error("Firecrawl request error, executing fallback scrape:", err);
      }
    }

    if (!scrapedContent) {
      scrapedContent = await generateMockScrape(aiClient, targetUrl, userVision);
      isMocked = true;
    }

    // STEP B: The Optimization Loop
    let previousChangeLog = "";
    let finalPayload: any = null;

    // Strict Gemini JSON Response Schema
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING },
        iteration: { type: Type.INTEGER },
        mode: { type: Type.STRING },
        confidence_score: { type: Type.NUMBER },
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
        enhanced_html: { type: Type.STRING },
      },
      required: [
        "status",
        "iteration",
        "mode",
        "confidence_score",
        "global_adjustments",
        "sections_optimized",
        "change_log_summary",
        "enhanced_html",
      ],
    };

    for (let loopIndex = 1; loopIndex <= maxLoops; loopIndex++) {
      // Data Hydration Safety & rate limit backoff sleep window to minimize 429 errors
      await sleep(220);

      const promptParts: any[] = [];
      if (adImagePart) {
        promptParts.push(adImagePart);
      }

      promptParts.push({
        text: `
          ### EXECUTION CYCLE ${loopIndex} OF ${maxLoops} ###

          [Scraped Data / Base Landing Page Content]:
          ${scrapedContent}

          [Ad Creative / Ad Copy text (if manual)]:
          ${adCreative || "None provided in text. Please analyze visual elements and text from the attached screenshot part of the request contents to match the ad scent!"}

          [User Vision / Audience targeting / Accessibility requests]:
          ${userVision}

          [Iteration Count]:
          ${loopIndex}

          [Previous Changes Log]:
          ${previousChangeLog || "No previous passes have occurred."}

          Please analyze, optimize, and output structural optimizations. 
          CRITICAL RULES:
          1. Keep the optimized Hero Heading/Title punchy and human-written. It should strictly contain between 5 to 11 words (approximately 45 to 70 characters max).
          2. Personalize the Hero Title to specifically match the hook, visuals, or copy angle shown in the [Ad Creative] visual input image file or ad copy text to maximize conversion confidence and secure perfect ad-to-page scent continuity.
          3. Generate a complete, beautifully designed single-page HTML output for 'enhanced_html'. This MUST contain the full enhanced/personalized version of the landing page, styled using Tailwind CSS (assume the CDN script <script src="https://cdn.tailwindcss.com"></script> is loaded in the <head>). 
             - Reconstruct the actual page structure, brand logo/identities, headings, list benefits, review snippets, FAQ sections, and final checkout CTAs from [Scraped Data / Base Landing Page Content] as a foundation.
             - Under no circumstances output a basic card. Replace the texts with the highly aligned optimized copy.
             - Structure the markup with generous responsive padding, modern layouts (such as beautiful side-by-side grids or content columns), gorgeous typography styles, clear risk-reversal banners, and high-contrast accessibility tags requested in [User Vision].
             - Ensure it looks like a premium, production-grade custom design, containing realistic visuals (preserving and reusing the exact original image URLs, product shots, background assets, and brand logos found in [Scraped Data] so they display properly in the personalized output preview), and fully functional elements. This will be rendered inside an iframe for side-by-side live conversion comparison!
          
          Format your response strictly according to the requested JSON response schema.
        `
      });

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: promptParts },
        config: {
          systemInstruction: CRO_AGENT_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });
      const responseText = response.text || "";

      if (!responseText) {
        throw new Error(`Empty response returned from Gemini API on cycle iteration ${loopIndex}`);
      }

      // Try-catch parse safety wrapper for robust rendering stream interceptor
      try {
        const parsed = JSON.parse(responseText.trim());
        parsed.iteration = loopIndex; // override with actual index
        finalPayload = parsed;
        previousChangeLog = parsed.change_log_summary || "";
      } catch (parseError) {
        console.error("JSON payload parse warning in loop pass:", loopIndex, parseError);
        // Attempt a manual fallback or maintain previous loop state as best effort
        if (!finalPayload) {
          throw new Error("Unable to establish base compliant JSON configuration from the CRO loop.");
        }
      }
    }

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
