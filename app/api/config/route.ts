// Path: app/api/config/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getGeminiKeys } from "@/app/lib/geminiClient";

/**
 * Endpoint to safely detect whether required platform API secrets are present in the server-side environment.
 * Exposes securely masked booleans to the client without leaking actual credentials information.
 * @param req Nex.js server HTTP request wrapper
 * @returns Masked boolean configuration flags regarding Firecrawl and Gemini keys
 */
export async function GET(req: NextRequest) {
  try {
    const geminiKeys = getGeminiKeys();
    return NextResponse.json({
      hasFirecrawlKey: !!process.env.FIRECRAWL_API_KEY,
      hasGeminiKey: geminiKeys.length > 0,
      hasExternalGeminiKey: !!process.env.EXTERNAL_GEMINI_API_KEY || !!process.env.EXTERNAL_GEMINI_API_KEYS,
      geminiKeyCount: geminiKeys.length,
    });
  } catch (error) {
    console.error("Failed to fetch environment config status:", error);
    return NextResponse.json({
      hasFirecrawlKey: false,
      hasGeminiKey: false
    }, { status: 500 });
  }
}
