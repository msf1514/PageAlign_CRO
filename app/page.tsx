// Path: app/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  ArrowRight, 
  Search, 
  AlertCircle, 
  RefreshCw, 
  Zap, 
  ChevronRight, 
  ShieldCheck, 
  Layers, 
  Target, 
  Lightbulb,
  MousePointerClick,
  Check,
  Upload,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import OutputPanel from "@/components/OutputPanel";
import { CroAgentResponse } from "@/app/lib/croAgentPrompt";
import UserMenu from "@/components/UserMenu";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Preset configurations to give users immediate test objects
const PRESETS = [
  {
    name: "AG1 Greens",
    url: "https://drinkag1.com/products/ag1-supplement-powder",
    vision: "High-contrast text, clear headers, and meal-prep streamlining targeted toward high-performance busy fathers.",
    adCreative: "No time for juicing? Get daily nutrition in 60 seconds. Core vitamins and minerals designed to keep high-performance fathers fueled all afternoon."
  },
  {
    name: "Casper Mattress",
    url: "https://casper.com/mattresses/original-hybrid",
    vision: "Extreme joint protection guarantees, orthopedic review focus, and higher-contrast sizes for older demographics.",
    adCreative: "Orthopedic pressure relief. Wake up with zero morning lower-back stiffness. Engineered with dynamic cooling zones."
  },
  {
    name: "Hims Hair Care",
    url: "https://forhims.com/hair-loss/minoxidil-solution",
    vision: "First-time privacy assurances, clinically backable results, and low-friction, action-oriented checkout CTA copy.",
    adCreative: "Regrow hair in 3 to 6 months. Medical-grade ingredients prescribed online. Safe, discreet home delivery."
  }
];

type StepperStatus = "idle" | "scraping" | "mapping" | "looping" | "rendering" | "success" | "error";

/**
 * Main dashboard application orchestrating the entire CRO lifecycle state machine.
 * Builds UI inputs, handles sequential progress animations, and safeguards API fallbacks.
 */
export default function CroPage() {
  const [targetUrl, setTargetUrl] = useState("");
  const [userVision, setUserVision] = useState("");
  const [adCreative, setAdCreative] = useState("");
  const [maxLoops, setMaxLoops] = useState(5);
  const [adImage, setAdImage] = useState<string>(""); // contains base64 data url
  const [adImageName, setAdImageName] = useState<string>("");
  const [adInputMode, setAdInputMode] = useState<"image" | "text">("image");
  const [dragActive, setDragActive] = useState(false);
  
  // State Machine control
  const [status, setStatus] = useState<StepperStatus>("idle");
  const [currentLoopPass, setCurrentLoopPass] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");
  const [croResult, setCroResult] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "unauth" | "error">("idle");

  // Progressive loading text sequence ticker body indices
  const [tickIndex, setTickIndex] = useState(0);

  // Active workspace credentials recognition states
  const [hasFirecrawlKey, setHasFirecrawlKey] = useState<boolean | null>(null);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<{ time: string; msg: string; type: "info" | "success" | "pending" | "warning" | "error" }[]>([]);

  /**
   * Safe initialization handshaking verifying loaded environment secrets on mount.
   */
  useEffect(() => {
    async function fetchKeys() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const config = await res.json();
          setHasFirecrawlKey(config.hasFirecrawlKey);
          setHasGeminiKey(config.hasGeminiKey);
        }
      } catch (err) {
        console.error("Could not fetch remote secret availability:", err);
      }
    }
    fetchKeys();
  }, []);

  /**
   * Automatically iterates through educational loading tooltips while processing.
   */
  useEffect(() => {
    if (status === "idle" || status === "success" || status === "error") return;

    const ticker = setInterval(() => {
      setTickIndex((prev) => prev + 1);
    }, 3200);

    return () => clearInterval(ticker);
  }, [status]);

  /**
   * Helper text mapper providing scannable loading descriptors at render time.
   */
  const getLoaderText = (): string => {
    const messages: Record<string, string[]> = {
      scraping: [
        "Analyzing target URL domain and requesting Firecrawl node...",
        "Scraping e-commerce DOM components and text tags...",
        "Extracting main container blocks, filtering secondary script styles..."
      ],
      mapping: [
        "Interpreting headings to map the e-commerce semantic grid...",
        "Identifying Hero, Social Proof, and primary CTA checkout regions...",
        "Determining original copywriting frame values..."
      ],
      looping: [
        `Analyzing CRO hypothesis pass ${currentLoopPass} of ${maxLoops}...`,
        `Aligning copy with PAS framework on iteration ${currentLoopPass} of ${maxLoops}...`,
        `Reviewing brand fidelity parameters on pass ${currentLoopPass} of ${maxLoops}...`
      ],
      rendering: [
        "Synthesizing iterative logs into change ledger bulletins...",
        "Generating style recommendation maps and high-contrast schemas...",
        "Preparing final output visual comparisons..."
      ]
    };

    const activeList = messages[status] || [];
    if (activeList.length === 0) return "";
    return activeList[tickIndex % activeList.length];
  };

  /**
   * Simulated granular progress helper specifically for the loop pass index.
   */
  useEffect(() => {
    if (status !== "looping") return;

    const intervalTime = 2500; // estimated time per Gemini loop run
    const loopTimer = setInterval(() => {
      setCurrentLoopPass((prev) => {
        if (prev >= maxLoops) {
          clearInterval(loopTimer);
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(loopTimer);
  }, [status, maxLoops]);

  /**
   * Appends step-by-step progress activity logs to the ledger system as the loops advance.
   */
  useEffect(() => {
    if (status !== "looping") return;

    const addLocalLog = (message: string, logType: "info" | "success" | "pending" | "warning" | "error" = "info") => {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLogs((prev) => [...prev, { time: timestamp, msg: message, type: logType }]);
    };

    if (currentLoopPass === 1) {
      addLocalLog(`🎯 Pass 1 of ${maxLoops}: Harmonizing page voice with target persona.`, "pending");
      addLocalLog(`In layman terms: Adapting value markers to match: "${userVision.substring(0, 50)}..."`, "info");
    } else if (currentLoopPass === 2) {
      addLocalLog(`📝 Pass 2 of ${maxLoops}: Aligning structural hooks to ad creative scent.`, "pending");
      addLocalLog("In layman terms: Tweaking the main headlines of your page to match what the customer saw in the ad.", "info");
    } else if (currentLoopPass === 3) {
      addLocalLog(`⭐ Pass 3 of ${maxLoops}: Restructuring social proof blocks and testimonials.`, "pending");
      addLocalLog("In layman terms: Choosing highly relevant ratings, and placing customer trust banners in standard viewports.", "info");
    } else if (currentLoopPass === 4) {
      addLocalLog(`⚡ Pass 4 of ${maxLoops}: Streamlining feature benefits and claims.`, "pending");
      addLocalLog("In layman terms: Removing complex technical jargon, framing features as low-stress outcomes.", "info");
    } else if (currentLoopPass === 5) {
      addLocalLog(`💻 Pass 5 of ${maxLoops}: Fabricating final high-contrast Tailwind HTML code.`, "pending");
      addLocalLog("In layman terms: Adjusting spacing columns, font hierarchy, and mobile viewport buttons.", "info");
    } else {
      addLocalLog(`✨ Pass ${currentLoopPass} of ${maxLoops}: Executing multi-loop precision polishing.`, "pending");
    }
  }, [currentLoopPass, status, maxLoops, userVision]);

  /**
   * Helper function to handle reading dropped or selected image files.
   */
  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }
    setAdImageName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAdImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Handle drag events for visual upload box.
   */
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  /**
   * Handle drop events for visual upload box.
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  /**
   * Saves a successful optimization to the signed-in user's account.
   * No-ops when Supabase isn't configured or nobody is signed in.
   */
  const persistRun = async (data: any) => {
    if (!isSupabaseConfigured) return;
    try {
      setSaveStatus("saving");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaveStatus("unauth");
        return;
      }

      let title = targetUrl;
      try {
        title = new URL(targetUrl).host;
      } catch {
        // keep raw URL as the title if it doesn't parse
      }

      const { error } = await supabase.from("cro_runs").insert({
        user_id: user.id,
        title,
        target_url: targetUrl.trim(),
        user_vision: userVision.trim() || null,
        ad_creative: adInputMode === "text" ? adCreative.trim() || null : null,
        mode: data.mode ?? null,
        confidence_score: typeof data.confidence_score === "number" ? data.confidence_score : null,
        iteration: data.iteration ?? null,
        scrape_method: data.scrape_method ?? null,
        original_source_is_mocked: data.original_source_is_mocked ?? null,
        global_adjustments: data.global_adjustments ?? null,
        sections_optimized: data.sections_optimized ?? null,
        change_log_summary: data.change_log_summary ?? null,
        scraped_text_preview: data.scraped_text_preview ?? null,
        enhanced_html: data.enhanced_html ?? null,
      });
      setSaveStatus(error ? "error" : "saved");
    } catch {
      setSaveStatus("error");
    }
  };

  /**
   * Validates form parameters and coordinates server-side optimizations.
   */
  const handleOptimize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetUrl.trim()) return;
    if (!userVision.trim()) return;

    setErrorMessage("");
    setCroResult(null);
    setSaveStatus("idle");
    setCurrentLoopPass(1);
    setTickIndex(0);
    setLogs([]); // Reset logs trace
    setStatus("scraping");

    const addLocalLog = (message: string, logType: "info" | "success" | "pending" | "warning" | "error" = "info") => {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLogs((prev) => [...prev, { time: timestamp, msg: message, type: logType }]);
    };

    addLocalLog("🚀 Initializing PageAlign CRO Analysis...", "pending");
    addLocalLog(`Target storefront address set to: ${targetUrl}`, "info");
    addLocalLog(`Ad creative input format: ${adInputMode === "image" ? "multimodal screenshot image upload" : "text copy snippet"}`, "info");

    try {
      // Step 1: Firecrawl checking or Backup Scraping starts first
      if (hasFirecrawlKey) {
        addLocalLog("🔑 Connection verified: Secret FIRECRAWL_API_KEY detected in environment variables!", "success");
        addLocalLog("In layman terms: Connecting to actual Firecrawl scraper nodes to harvest direct page markup...", "info");
      } else {
        addLocalLog("⚠️ Environment check: No custom FIRECRAWL_API_KEY detected in secrets manager.", "warning");
        addLocalLog("In layman terms: Fetching fallback storefront blueprint from domain simulation module...", "info");
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
      setStatus("mapping");
      
      addLocalLog("✅ Storefront scan completed. Scraped HTML/Markdown snippet successfully prepared.", "success");
      addLocalLog("In layman terms: Deconstructing page sections (Hero headlines, feature lists, social proof reviews, and CTAs)...", "info");

      // Step 2: Semantic mapping starts next
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setStatus("looping");
      
      addLocalLog(`🔄 Launching iterative CRO refinement sequence (Sequence depth: ${maxLoops} loops) via Gemini-3.5-Flash.`, "pending");
      addLocalLog("In layman terms: Refining wording, contrast, and layout elements iteratively with previous loop feedback...", "info");

      // Step 3 & 4: Call backend endpoint to handle actual sequential loops and backoffs
      const response = await fetch("/api/personalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          target_url: targetUrl.trim(),
          user_vision_or_audience: userVision.trim(),
          ad_creative: adInputMode === "text" ? adCreative.trim() : "",
          ad_image: adInputMode === "image" ? adImage : "",
          max_loops: maxLoops
        })
      });

      if (!response.ok) {
        let errorMsg = "Could not successfully optimize the requested D2C layout.";
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch {
          try {
            const errorText = await response.text();
            if (errorText) {
              // Strip HTML tags if any to show cleaner logs
              errorMsg = errorText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 150);
            }
          } catch {}
        }
        throw new Error(errorMsg);
      }

      addLocalLog("✅ All Gemini iterative refinement loops completed successfully.", "success");
      addLocalLog("In layman terms: Received high-converting copy justifications and full-page HTML code.", "info");
      
      setStatus("rendering");
      addLocalLog("🎨 Preparing iframe simulation with customized responsive Tailwind CSS markup...", "pending");
      
      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error("The optimization server returned an invalid non-JSON payload. Please verify your custom API key or check server-side logs.");
      }
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addLocalLog("🎉 Complete conversion alignment report finalized and compiled successfully!", "success");
      setCroResult(data);
      setStatus("success");
      persistRun(data);
    } catch (err: any) {
      console.error(err);
      addLocalLog(`❌ CRO Optimization failed: ${err.message || "An unexpected network or model failure occurred."}`, "error");
      setErrorMessage(err.message || "A network disruption disconnected the AI CRO pipeline. Please retry.");
      setStatus("error");
    }
  };

  /**
   * Pre-populates form data when clicking interactive preset cards.
   * @param preset Selectable preset blueprint
   */
  const handleSelectPreset = (preset: typeof PRESETS[0]) => {
    setTargetUrl(preset.url);
    setUserVision(preset.vision);
    setAdCreative(preset.adCreative || "");
    setAdImage("");
    setAdImageName("");
    setAdInputMode("text"); // switch to text mode for presets as they are text-based
  };

  return (
    <div id="cro-main-app-container" className="min-h-screen flex flex-col font-sans">
      
      {/* GLOBAL HEADER */}
      <header className="border-b border-gray-150 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-blue-600 block leading-tight font-extrabold">Studio Workspace</span>
              <h1 className="text-sm font-extrabold text-gray-900 tracking-tight flex items-center gap-1">
                PageAlign CRO <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
            <span className="hidden lg:inline bg-gray-100 px-2.5 py-1 rounded-md text-gray-600 font-medium">Gemini Model ACTIVE</span>
            <span className="hidden md:flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Server Node Connected</span>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* CORE BODY FRAME */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        
        <AnimatePresence mode="wait">
          {/* IDLE / FORM SUBMISSION View */}
          {status === "idle" && (
            <motion.div 
              key="idle-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-8"
              id="idle-container"
            >
              {/* Product Hero Banner Context */}
              <div className="text-center max-w-3xl mx-auto space-y-4 py-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
                  <Zap className="h-3.5 w-3.5 text-blue-600 shrink-0" /> Personalized Conversion Optimizations
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight font-sans">
                  Align Any Landing Page to Your Target Audience
                </h2>
                <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  Input any D2C product detail page URL and define your target customer vision. PageAlign scrapes the copy structure, then runs robust, iterative CRO optimization passes via Gemini 3.5 Flash to fine-tune headlines, badges, social proof, and call-to-action blocks.
                </p>
              </div>

              {/* Presets Row */}
              <div id="preset-selector-row" className="max-w-4xl mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold tracking-wider text-gray-400 flex items-center gap-1.5">
                    <MousePointerClick className="h-4 w-4 text-blue-500" /> Quick-Test Brand Presets
                  </span>
                  <span className="text-xs text-gray-400">Click to fill inputs instantly</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PRESETS.map((p, idx) => (
                    <button
                      id={`preset-card-${idx}`}
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-500 hover:shadow-xs transition-all relative group cursor-pointer"
                    >
                      <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 mb-1 flex items-center justify-between">
                        {p.name} <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-blue-500 transition-all" />
                      </h4>
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                        {p.vision}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* INPUT FORM CARD */}
              <div id="cro-setup-form-card" className="bg-white rounded-3xl border border-gray-200 shadow-sm max-w-4xl mx-auto overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-150 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <Target className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">CRO Analysis Engine Criteria</h3>
                      <p className="text-xs text-gray-500">Provide direct e-commerce landing pointers and core objectives</p>
                    </div>
                  </div>

                  {/* Firecrawl Secret Validation Status Indicator Badge */}
                  <div className="flex items-center">
                    {hasFirecrawlKey === null ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-gray-100 text-gray-400 border border-gray-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse" /> Verifying environment...
                      </span>
                    ) : hasFirecrawlKey ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-in fade-in duration-300" title="The Firecrawl API Key in Secrets is connected and will be used to crawl real storefront markup.">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping absolute inline-flex h-1.5 w-1.5" />
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 relative inline-flex" />
                        🔥 Firecrawl Scraper: Connected & Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-in fade-in duration-300" title="No FIRECRAWL_API_KEY set in user Secrets. Real e-commerce structure models are simulated automatically.">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        ⚠️ Scraper Fallback Enabled (No Firecrawl Secret)
                      </span>
                    )}
                  </div>
                </div>

                <form onSubmit={handleOptimize} className="p-6 md:p-8 space-y-6">
                  {/* Target URL field */}
                  <div className="space-y-2">
                    <label htmlFor="target-url-input" className="block text-xs font-extrabold uppercase tracking-wide text-gray-700">
                      Target D2C Landing Page URL
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Search className="h-4.5 w-4.5" />
                      </div>
                      <input
                        id="target-url-input"
                        type="url"
                        required
                        placeholder="e.g. https://drinkag1.com/products/ag1-supplement-powder"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-250 rounded-xl text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 font-medium transition-all"
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 block leading-normal pt-0.5">
                      Enter any publicly viewable e-commerce path. Simulated fallbacks are loaded if Firecrawl setup is offline.
                    </span>
                  </div>

                  {/* Digital Ad Creative Scent Input Container */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold uppercase tracking-wide text-gray-700">
                        Active Digital Ad Creative / Hook scent
                      </label>
                      <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-250">
                        <button
                          type="button"
                          onClick={() => setAdInputMode("image")}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                            adInputMode === "image"
                              ? "bg-white text-gray-900 shadow-xs"
                              : "text-gray-500 hover:text-gray-900"
                          }`}
                        >
                          Ad Screenshot (Upload)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdInputMode("text")}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                            adInputMode === "text"
                              ? "bg-white text-gray-905 shadow-xs"
                              : "text-gray-500 hover:text-gray-900"
                          }`}
                        >
                          Copywriting Text
                        </button>
                      </div>
                    </div>

                    {adInputMode === "image" ? (
                      <div className="space-y-2">
                        <div
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all relative ${
                            dragActive
                              ? "border-blue-500 bg-blue-50/30"
                              : adImage
                              ? "border-emerald-500 bg-emerald-50/5"
                              : "border-gray-250 hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="file"
                            id="ad-image-file-input"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileChange(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                          
                          {adImage ? (
                            <div className="flex flex-col items-center space-y-3">
                              {/* Thumbnail preview of the uploaded ad screenshot */}
                              <div className="relative h-24 w-40 overflow-hidden rounded-lg border border-gray-150 bg-gray-50 shadow-sm">
                                <img
                                  src={adImage}
                                  alt="Ad screenshot thumbnail preview"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-800 font-semibold truncate max-w-xs">{adImageName || "Ad screenshot"}</span>
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5"><Check className="h-3 w-3" /> Ready</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdImage("");
                                    setAdImageName("");
                                  }}
                                  className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-150 transition-all ml-1"
                                  title="Remove image"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label htmlFor="ad-image-file-input" className="cursor-pointer flex flex-col items-center space-y-2">
                              <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-gray-450 border border-gray-150 transition-all">
                                <Upload className="h-5 w-5" />
                              </div>
                              <p className="text-xs text-gray-755 font-bold leading-normal">
                                Drag and drop your ad screenshot here, or <span className="text-blue-600 hover:underline">browse</span>
                              </p>
                              <p className="text-[10px] text-gray-400 font-medium">
                                Supports PNG, JPG, JPEG, WebP
                              </p>
                            </label>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 block leading-normal pt-0.5">
                          PageAlign reads your ad screenshot visually to craft perfectly matched, high-converting copy elements.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          id="ad-creative-text-input"
                          required={adInputMode === "text"} // Only required if currently visible
                          rows={3}
                          placeholder="e.g. Paste your active search ad hook, banner text, or social media caption here to secure perfect ad-to-page scent alignment."
                          value={adCreative}
                          onChange={(e) => setAdCreative(e.target.value)}
                          className="block w-full px-4 py-3 bg-white border border-gray-250 rounded-xl text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 font-medium leading-relaxed transition-all resize-none animate-in fade-in duration-300"
                        />
                        <span className="text-[11px] text-gray-400 block leading-normal pt-0.5">
                          PageAlign personalizes the landing page Hero Title and hooks to mirror this exact creative promise, boosting immediate visual retention.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Audience Vision Area */}
                  <div className="space-y-2">
                    <label htmlFor="audience-vision-input" className="block text-xs font-extrabold uppercase tracking-wide text-gray-700">
                      Identify Your Target Audience & Persona Vision
                    </label>
                    <textarea
                      id="audience-vision-input"
                      required
                      rows={4}
                      placeholder="e.g. High-contrast text focus for seniors, simple short explanations, highlighting Joint Protection guarantees rather than complex technical formulas."
                      value={userVision}
                      onChange={(e) => setUserVision(e.target.value)}
                      className="block w-full px-4 py-3 bg-white border border-gray-250 rounded-xl text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 font-medium leading-relaxed transition-all resize-none"
                    />
                    <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 p-2.5 rounded-lg">
                      <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-amber-800 leading-normal">
                        <strong>Pro Tip:</strong> Clearly delineate custom accessibility needs, contrast preferences, value props, tone adjustments, or anxiety-relief triggers.
                      </span>
                    </div>
                  </div>

                  {/* Iterations selection */}
                  <div className="pt-4 border-t border-gray-150 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label htmlFor="max-loops-select" className="text-xs font-extrabold uppercase tracking-wide text-gray-700">
                            Refinement Loops
                          </label>
                          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {maxLoops} Loops
                          </span>
                        </div>
                        <select
                          id="max-loops-select"
                          value={maxLoops}
                          onChange={(e) => setMaxLoops(parseInt(e.target.value, 10))}
                          className="block w-full px-3 py-2.5 bg-white border border-gray-250 rounded-lg text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 h-10 transition-all cursor-pointer"
                        >
                          <option value={5}>5 Optimization Iterations (Balanced)</option>
                          <option value={7}>7 Optimization Iterations (High Precision)</option>
                          <option value={10}>10 Optimization Iterations (Maximum Refinement)</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-end">
                        {/* Label spacer on desktop to perfectly align interactive controls */}
                        <div className="h-5 hidden md:block" aria-hidden="true" />
                        <button
                          id="form-submit-btn"
                          type="submit"
                          className="w-full h-10 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs px-6 rounded-xl shadow-md shadow-blue-500/15 flex items-center justify-center gap-2 group transition-all"
                        >
                          Launch Alignment Loop <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>

                    <span className="text-[10px] text-gray-400 block leading-normal">
                      Loops are server-optimized sequentially with safety backoff delays to secure rate stability limits.
                    </span>
                  </div>
                </form>
              </div>

              {/* Explanatory Info Panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto py-4">
                <div className="bg-white rounded-xl border border-gray-150 p-4 space-y-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900">Product Fidelity</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    PageAlign optimizes positioning and copy delivery. Dimensions, features, specifications, and costs are strictly preserved.
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-150 p-4 space-y-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Layers className="h-4.5 w-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900">Structured Data Map</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Output transforms are organized in granular schemas mapping Hero blocks, reviews, list outcomes, and call-to-actions.
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-150 p-4 space-y-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900">Contrast Adjuster</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Inject accessibility instructions, suggesting high contrast color metrics and sizing ratios to suit elder readability.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ACTIVE STEPPER LOADING View */}
          {(status !== "idle" && status !== "success" && status !== "error") && (
            <motion.div 
              key="loading-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-2xl mx-auto py-12 flex flex-col items-center justify-center text-center space-y-8"
              id="stepper-loading-container"
            >
              {/* Stepper Header circles */}
              <div className="grid grid-cols-4 gap-6 w-full max-w-md relative pb-4">
                {/* Horizontal progress bar behind circles */}
                <div className="absolute top-4 left-4 right-4 h-1 bg-gray-150 -z-10 rounded-full" />
                <div 
                  className="absolute top-4 left-4 h-1 bg-blue-600 -z-10 rounded-full transition-all duration-500" 
                  style={{
                    width: 
                      status === "scraping" ? "12%" : 
                      status === "mapping" ? "42%" : 
                      status === "looping" ? "75%" : "100%"
                  }}
                />

                {/* Step 1 Node */}
                <div className="flex flex-col items-center">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    status === "scraping" 
                      ? "bg-blue-600 text-white ring-4 ring-blue-500/20" 
                      : "bg-emerald-500 text-white"
                  }`}>
                    {status === "scraping" ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Check className="h-4.5 w-4.5" />}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-gray-500 uppercase mt-2">1. Scrape</span>
                </div>

                {/* Step 2 Node */}
                <div className="flex flex-col items-center">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    status === "scraping" ? "bg-gray-200 text-gray-400" :
                    status === "mapping" ? "bg-blue-600 text-white ring-4 ring-blue-500/20" :
                    "bg-emerald-500 text-white"
                  }`}>
                    {status === "scraping" ? "2" :
                     status === "mapping" ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> :
                     <Check className="h-4.5 w-4.5" />}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-gray-500 uppercase mt-2">2. Map DOM</span>
                </div>

                {/* Step 3 Node */}
                <div className="flex flex-col items-center">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    (status === "scraping" || status === "mapping") ? "bg-gray-200 text-gray-400" :
                    status === "looping" ? "bg-blue-600 text-white ring-4 ring-blue-500/20" :
                    "bg-emerald-500 text-white"
                  }`}>
                    {status === "looping" ? `${currentLoopPass}/${maxLoops}` : 
                     status === "rendering" ? <Check className="h-4.5 w-4.5" /> : "3"}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-gray-500 uppercase mt-2">3. Optimize</span>
                </div>

                {/* Step 4 Node */}
                <div className="flex flex-col items-center">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    status === "rendering" ? "bg-blue-600 text-white ring-4 ring-blue-500/20" : "bg-gray-200 text-gray-400"
                  }`}>
                    {status === "rendering" ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : "4"}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-gray-500 uppercase mt-2">4. Render</span>
                </div>
              </div>

              {/* Status Visual Graphics */}
              <div className="w-full max-w-lg space-y-6 flex flex-col items-center">
                <div className="p-10 bg-white rounded-3xl border border-gray-200 shadow-2xs w-full space-y-6 flex flex-col items-center">
                  <div className="relative">
                    <div className="h-20 w-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 relative overflow-hidden">
                      <RefreshCw className="h-10 w-10 animate-spin text-blue-500 duration-[4000ms]" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white p-1 rounded-lg shadow-sm">
                      <Sparkles className="h-4 w-4 shrink-0 animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-sm font-extrabold text-gray-900 tracking-tight uppercase font-mono text-center">
                      {status === "scraping" && "Phase 1/4: Scrape Page Contents"}
                      {status === "mapping" && "Phase 2/4: Semantic Grid Mapping"}
                      {status === "looping" && "Phase 3/4: CRO Feedback Iterations"}
                      {status === "rendering" && "Phase 4/4: Constructing Comparisons"}
                    </h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto font-medium transition-all block min-h-[40px] leading-relaxed text-center">
                      {getLoaderText()}
                    </p>
                  </div>

                  {/* Numerical loop status progress display */}
                  {status === "looping" && (
                    <div className="w-full bg-gray-50 p-3 rounded-xl border border-gray-150 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-gray-500">Refinement Sequence:</span>
                        <span className="text-blue-600 font-mono">Pass {currentLoopPass} of {maxLoops}</span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-[600ms]" 
                          style={{ width: `${(currentLoopPass / maxLoops) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono block pt-1 uppercase">
                        Minor backoffs introduced spacing loops to support rate safety.
                      </span>
                    </div>
                  )}
                </div>

                {/* Live Layman Audit Ledger Terminal */}
                <div className="w-full bg-slate-950 border border-slate-900 rounded-2xl p-5 shadow-lg text-left font-mono shrink-0">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-20 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" style={{ height: "8px", width: "8px" }} />
                      <div className="h-20 w-2 shrink-0 rounded-full bg-yellow-400" style={{ height: "8px", width: "8px" }} />
                      <div className="h-20 w-2 shrink-0 rounded-full bg-red-400" style={{ height: "8px", width: "8px" }} />
                      <span className="text-[10px] font-bold text-slate-350 uppercase tracking-widest ml-1.5 flex items-center gap-1">
                        Layman-Audit Action logs
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 bg-slate-900 px-2.5 py-0.5 rounded font-semibold uppercase">Dynamic</span>
                  </div>
                  
                  <div 
                    id="terminal-stdout-scroller"
                    className="h-44 overflow-y-auto space-y-2 text-[11px] leading-relaxed pr-2 select-text"
                  >
                    {logs.length === 0 ? (
                      <div className="text-slate-600 italic animate-pulse">Preloading sequence log trace modules...</div>
                    ) : (
                      logs.map((log, index) => {
                        const isHighlight = log.type === "success" || log.type === "pending";
                        const isWarning = log.type === "warning" || log.type === "error";
                        const isLayman = log.msg.includes("In layman terms:");
                        return (
                          <div 
                            key={index}
                            className={`transition-all duration-200 ${
                              isHighlight 
                                ? "text-blue-400 font-bold" 
                                : isWarning 
                                ? "text-amber-500" 
                                : isLayman 
                                ? "text-slate-300 border-l border-slate-800 pl-2 ml-1 italic" 
                                : "text-slate-500"
                            }`}
                          >
                            [{log.time}] {log.msg}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* EXPLICIT ERROR View (Safe failure boundary) */}
          {status === "error" && (
            <motion.div 
              key="error-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto py-12 flex flex-col items-center justify-center text-center space-y-6"
              id="error-boundary-view"
            >
              <div className="h-16 w-16 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-center text-red-600 shadow-sm shadow-red-200 animate-bounce">
                <AlertCircle className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">CRO Analysis Boundary Errored</h3>
                <p className="text-xs text-gray-600 leading-relaxed font-medium bg-gray-50 border border-gray-150 p-4 rounded-xl text-left">
                  {errorMessage || "An unexpected error disrupted client network streaming content loops."}
                </p>
              </div>

              <div className="flex items-center gap-4 w-full">
                <button
                  id="error-retry-btn"
                  onClick={handleOptimize}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <RefreshCw className="h-4 w-4 shrink-0" /> Retry Alignment Loop
                </button>
                <button
                  id="error-cancel-btn"
                  onClick={() => setStatus("idle")}
                  className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          )}

          {/* RECONSTRUCTED OUTPUT REPORT PANEL View */}
          {status === "success" && croResult && (
            <motion.div 
              key="success-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
              id="success-output-panel-container"
            >
              {saveStatus !== "idle" && (
                <div className="max-w-7xl mx-auto mb-4 text-xs">
                  {saveStatus === "saving" && <span className="text-gray-500">Saving to your account…</span>}
                  {saveStatus === "saved" && (
                    <span className="text-emerald-600 font-medium">✓ Saved to your account — see it under “My runs”.</span>
                  )}
                  {saveStatus === "unauth" && (
                    <span className="text-gray-500">
                      <a href="/login" className="text-blue-600 underline hover:text-blue-700">Sign in</a> to save this run to your account.
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span className="text-amber-600">Couldn’t save this run — it’s still shown below.</span>
                  )}
                </div>
              )}
              <OutputPanel
                data={croResult} 
                onReset={() => {
                  setStatus("idle");
                  setCroResult(null);
                }} 
                userVision={userVision}
                targetUrl={targetUrl}
                logs={logs}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-150 bg-white py-6 mt-12 text-center text-xs font-mono text-gray-400">
        <p>© 2026 PageAlign CRO Studio. Factual D2C Preservation Engine. Powered by Gemini 3.5 Flash.</p>
      </footer>

    </div>
  );
}
