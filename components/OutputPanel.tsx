// Path: components/OutputPanel.tsx

import React, { useState } from "react";
import { 
  ArrowRight, 
  Sparkles, 
  Check, 
  ChevronRight, 
  BookOpen, 
  CheckCircle, 
  Eye, 
  RefreshCw, 
  Settings,
  HelpCircle,
  MessageSquare,
  Flame,
  Award,
  Maximize2,
  Minimize2,
  X
} from "lucide-react";
import { motion } from "motion/react";
import { SectionOptimized, CroAgentResponse } from "@/app/lib/croAgentPrompt";

/**
 * Detailed property validation map for the OutputPanel module.
 */
interface OutputPanelProps {
  data: CroAgentResponse & {
    original_source_is_mocked?: boolean;
    scraped_text_preview?: string;
    enhanced_html?: string;
  };
  onReset: () => void;
  userVision: string;
  targetUrl: string;
  logs?: { time: string; msg: string; type: "info" | "success" | "pending" | "warning" | "error" }[];
}

/**
 * Renders the primary comparison, interactive mockups, and performance change-logs
 * derived from the server-side CRO sequence.
 * @param props Contains optimized state blocks, user criteria, and source URLs
 * @returns Fully responsive, clean side-by-side interactive dashboard layout
 */
export default function OutputPanel({ data, onReset, userVision, targetUrl, logs = [] }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<"comparison" | "scraped" | "audit">("comparison");
  const [selectedSection, setSelectedSection] = useState<string>("hero");
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [fullScreenMode, setFullScreenMode] = useState<"fixed" | "fluid">("fixed");

  /**
   * Toggles the interactive desktop CRO simulation portal inside an immersive, screen-centered absolute lightbox.
   * @param status Boolean indicating whether to open or dismiss the high-fidelity fullscreen viewport overlay
   * @returns void
   */
  const handleFullScreenToggle = (status: boolean): void => {
    setIsFullScreen(status);
  };
  
  const sections = data.sections_optimized || [];
  const globalAdjustments = data.global_adjustments || {
    contrast_enhancements: "Standard optimal contrast.",
    overall_tone_applied: "Persuasive D2C tone."
  };

  // Helper selectors to extract specific section types
  const heroSection = sections.find(s => s.section_type.toLowerCase() === "hero") || sections[0];
  const proofSection = sections.find(s => s.section_type.toLowerCase().includes("proof") || s.section_type.toLowerCase().includes("social") || s.section_type.toLowerCase().includes("review"));
  const featuresSection = sections.find(s => s.section_type.toLowerCase().includes("feature") || s.section_type.toLowerCase().includes("benef"));
  const faqSection = sections.find(s => s.section_type.toLowerCase().includes("faq") || s.section_type.toLowerCase().includes("quest"));
  const ctaSection = sections.find(s => s.section_type.toLowerCase() === "cta" || s.section_type.toLowerCase().includes("offer") || s.section_type.toLowerCase().includes("button"));

  // Extracted lists or default fallback texts
  const heroHeading = heroSection ? heroSection.optimized_text : "Elevate Your Living Standard";
  const heroBefore = heroSection ? heroSection.original_text_snippet : "Buy our premium kitchen equipment.";
  const heroJust = heroSection ? heroSection.cro_justification : "Value-oriented direct outcomes increase immediate session metrics.";

  const proofText = proofSection ? proofSection.optimized_text : "Verified by 45,000+ happy customers with a 4.9/5 lifetime rating.";
  const proofBefore = proofSection ? proofSection.original_text_snippet : "We have great customer satisfaction scores.";
  const proofJust = proofSection ? proofSection.cro_justification : "Specific quantifiers generate higher authority values.";

  const featuresText = featuresSection ? featuresSection.optimized_text : "Designed to run silently, save up to 40% on daily electricity, and wash clean in seconds.";
  const featuresBefore = featuresSection ? featuresSection.original_text_snippet : "Our machine is silent and runs on standard power grids.";
  const featuresJust = featuresSection ? featuresSection.cro_justification : "Emphasizes convenience metrics that map to day-to-day anxiety relief.";

  const faqText = faqSection ? faqSection.optimized_text : "Does it require monthly subscriptions? No. One purchase gets you lifetime firmware updates and a 3-Year Bulletproof Warranty.";
  const faqBefore = faqSection ? faqSection.original_text_snippet : "We offer lifetime software updates.";
  const faqJust = faqSection ? faqSection.cro_justification : "Frames the purchase as a low-risk, asset-backed solution.";

  const ctaText = ctaSection ? ctaSection.optimized_text : "Claim Your 100-Day Risk-Free Trial";
  const ctaBefore = ctaSection ? ctaSection.original_text_snippet : "Add to Cart";
  const ctaJust = ctaSection ? ctaSection.cro_justification : "Reduces transaction friction and frames checkout as a testing trial.";

  return (
    <div id="output-panel-root" className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-7xl mx-auto">
      {/* LEFT PANEL: Optimization Ledger and Comparative Logs (Cols: 7) */}
      <div id="left-ledger-panel" className="lg:col-span-7 flex flex-col space-y-6">
        
        {/* Header Summary Stats Card */}
        <div id="cro-optimization-meta-card" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-blue-50/50 rounded-full blur-3xl -z-10" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full flex items-center gap-1 border border-emerald-100">
                  <Check className="h-3 w-3" /> Successfully Aligned
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {data.iteration} Cycles Complete
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Optimization Report</h2>
              <p className="text-sm text-gray-500 truncate mt-0.5">{targetUrl}</p>
            </div>
            
            <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="text-center px-2">
                <span className="text-xs text-gray-400 font-mono block uppercase">Confidence</span>
                <span className="text-lg font-bold text-gray-800">{(data.confidence_score * 100).toFixed(0)}%</span>
              </div>
              <div className="h-8 w-[1px] bg-gray-200" />
              <div className="text-center px-2">
                <span className="text-xs text-gray-400 font-mono block uppercase">Mode</span>
                <span className="text-sm font-bold text-blue-600 block truncate max-w-[120px]">
                  {data.mode === "universal_cro_enhanced" ? "Precision CRO" : data.mode}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-amber-500" /> Applied Copy Angle
              </h3>
              <p id="overall-tone" className="text-sm text-gray-700 font-medium leading-relaxed bg-amber-50/50 p-3 rounded-lg border border-amber-100/50">
                {globalAdjustments.overall_tone_applied}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                <Settings className="h-3.5 w-3.5 text-blue-500" /> Layout/Contrast Settings
              </h3>
              <p id="contrast-enhancements" className="text-sm text-gray-700 font-medium leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                {globalAdjustments.contrast_enhancements}
              </p>
            </div>
          </div>
        </div>

        {/* Change Log Feed Segment */}
        <div id="change-log-panel" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold tracking-wider text-gray-800 uppercase flex items-center gap-1.5 font-mono">
              <Sparkles className="h-4 w-4 text-amber-500" /> CRO Optimization Ledger
            </h3>
            <span className="text-xs text-blue-600 font-medium font-mono">Loop Chain Ledger</span>
          </div>
          <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100 text-sm text-gray-600 leading-relaxed font-sans prose prose-neutral max-w-none">
            <ul className="space-y-2 list-none pl-0">
              {data.change_log_summary.split("\n").filter(line => line.trim()).map((bullet, i) => {
                const cleanedBullet = bullet.replace(/^-\s*/, "").replace(/^\*\s*/, "");
                return (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{cleanedBullet}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Comparison Header with Tabs */}
        <div id="section-break-header" className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              id="tab-btn-comparison"
              onClick={() => setActiveTab("comparison")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "comparison" 
                  ? "bg-white text-gray-900 shadow-xs" 
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Side-by-Side Comparison
            </button>
            <button
              id="tab-btn-scraped"
              onClick={() => setActiveTab("scraped")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "scraped" 
                  ? "bg-white text-gray-900 shadow-xs" 
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Raw Target Content {data.original_source_is_mocked && "(Simulated)"}
            </button>
            <button
              id="tab-btn-audit"
              onClick={() => setActiveTab("audit")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "audit" 
                  ? "bg-white text-gray-900 shadow-xs" 
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Layman Execution Logs
            </button>
          </div>
          
          <button
            id="reset-cro-engine-btn"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all"
          >
            <RefreshCw className="h-3 w-3" /> Optimize Another Page
          </button>
        </div>

        {/* Tab Content Display */}
        {activeTab === "comparison" && (
          <div id="comparison-blocks-container" className="space-y-4 animate-in fade-in duration-200">
            {sections.map((sec, idx) => {
              const isSelected = selectedSection === sec.section_type.toLowerCase();
              return (
                <div 
                  id={`comparison-card-${sec.section_type}`}
                  key={idx}
                  onClick={() => setSelectedSection(sec.section_type.toLowerCase())}
                  className={`bg-white rounded-xl border p-5 transition-all cursor-pointer ${
                    isSelected 
                      ? "ring-2 ring-blue-500 border-transparent shadow-md" 
                      : "border-gray-150 hover:border-gray-300 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                      {sec.section_type}
                    </span>
                    <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                      {isSelected ? "Active Focus" : "Click to view highlight"} <Eye className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Before/Original section content */}
                    <div className="bg-red-50/50 p-3.5 rounded-lg border border-red-100/50">
                      <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-red-500 block mb-1">
                        Original CopySnippet
                      </span>
                      <p className="text-xs text-gray-600 line-through leading-relaxed">
                        {sec.original_text_snippet || "Text could not be located in initial scrape."}
                      </p>
                    </div>

                    {/* After/Optimized section content */}
                    <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-100/50">
                      <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-emerald-600 block mb-1">
                        Envisioned CRO Copysnippet
                      </span>
                      <p className="text-xs font-medium text-gray-900 leading-relaxed">
                        {sec.optimized_text}
                      </p>
                    </div>
                  </div>

                  {/* Justification segment */}
                  <div className="mt-4 pt-3.5 border-t border-gray-100 bg-blue-50/20 px-3 py-2.5 rounded-lg border border-blue-50">
                    <h4 className="text-xs font-semibold text-gray-800 flex items-center gap-1 mb-1">
                      <Award className="h-3.5 w-3.5 text-blue-500" /> Conversion Hypothesis (Why this sells better)
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed font-sans">
                      {sec.cro_justification}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "scraped" && (
          <div id="raw-scraped-content-view" className="bg-gray-900 text-gray-300 rounded-xl p-5 font-mono text-xs overflow-x-auto border border-gray-800 shadow-inner animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-4">
              <span className="text-gray-500">FORMAT: E-COMMERCE MARKDOWN TREE</span>
              <span className="text-emerald-500 uppercase">{data.original_source_is_mocked ? "Simulated Scrape Fallback" : "Scraped Page"}</span>
            </div>
            <pre className="whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
              {data.scraped_text_preview || "No data scraped from the requested D2C page."}
            </pre>
          </div>
        )}

        {activeTab === "audit" && (
          <div id="audit-logs-view" className="bg-slate-900 text-slate-100 rounded-xl p-5 font-mono text-xs border border-slate-800 shadow-inner animate-in fade-in duration-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <h4 className="text-slate-400 font-bold uppercase tracking-wider">Historical System Activity Log</h4>
              <span className="text-emerald-500 font-bold uppercase text-[9px] bg-emerald-950/50 border border-emerald-900 px-2 py-0.5 rounded">
                Successfully Executed
              </span>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="p-4 bg-slate-950 text-slate-500 italic text-center rounded-lg">
                  No audit log data collected for this execution cycle.
                </div>
              ) : (
                logs.map((log, lIdx) => (
                  <div 
                    key={lIdx} 
                    className={`p-3 rounded-lg border leading-relaxed ${
                      log.type === "success" 
                        ? "bg-emerald-950/20 border-emerald-900/60 text-emerald-300" 
                        : log.type === "warning" 
                        ? "bg-amber-950/20 border-amber-900/50 text-amber-300"
                        : log.type === "error"
                        ? "bg-red-950/20 border-red-900/50 text-red-300"
                        : "bg-slate-950/45 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold mb-1">
                      <span>[{log.time}]</span>
                      <span className={`uppercase font-extrabold font-mono ${
                        log.type === "success" ? "text-emerald-500" :
                        log.type === "warning" ? "text-amber-500" :
                        log.type === "error" ? "text-red-500" : "text-blue-400"
                      }`}>
                        ● {log.type}
                      </span>
                    </div>
                    <div>{log.msg}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Live Interactive Preview Card Mockup (Cols: 5) */}
      <div id="right-preview-panel" className="lg:col-span-5 flex flex-col space-y-4">
        
        {/* Device Settings Header */}
        <div id="device-switcer-header" className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-mono font-semibold text-gray-500 uppercase">Interactive Desktop Preview</h3>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              id="desktop-fullscreen-btn"
              onClick={() => handleFullScreenToggle(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-extrabold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-105 border border-blue-200 rounded-lg transition-all cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Full Screen
            </button>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-700 tracking-wider border border-gray-200">DESKTOP PLATFORM</span>
          </div>
        </div>

        {/* Live Mock Device frame container */}
        <div 
          id="mock-device-viewport" 
          className="mx-auto w-full aspect-[16/10.5] min-h-[420px] shadow-lg bg-gray-950 rounded-2xl border border-gray-800 transition-all duration-300 relative overflow-hidden flex flex-col"
        >
          {/* Simulated Browser Bar */}
          <div className="bg-gray-900 px-4 py-2 flex items-center gap-2 border-b border-gray-800">
            <div className="flex gap-1 shrink-0">
              <span className="h-2.5 w-2.5 bg-red-500 rounded-full inline-block" />
              <span className="h-2.5 w-2.5 bg-yellow-500 rounded-full inline-block" />
              <span className="h-2.5 w-2.5 bg-green-500 rounded-full inline-block" />
            </div>
            <div className="bg-gray-800 text-[10px] text-gray-400 py-0.5 px-3 rounded-md w-full truncate text-center font-sans tracking-wide">
              {targetUrl ? targetUrl.replace("https://", "") : "d2c-store.com"}
            </div>
          </div>

          {/* Interactive Simulated Web Page Render Content */}
          <div 
            id="simulated-browser-scroll-viewport"
            className="flex-1 bg-slate-50 relative flex flex-col"
          >
            {data.enhanced_html ? (
              <iframe
                id="enhanced-html-viewport-iframe"
                srcDoc={data.enhanced_html}
                className="w-full h-full border-0 bg-white"
                title="PageAlign Personalized Landing Page Preview"
                sandbox="allow-scripts"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <Sparkles className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                <p className="text-sm font-medium">Reconstructing actual storefront copy alignment...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Immersive High-Fidelity Fullscreen Simulative CRO Sandbox Layer */}
      {isFullScreen && (
        <div 
          id="fullscreen-sandbox-overlay"
          className="fixed inset-0 bg-gray-950/98 backdrop-blur-md z-50 flex flex-col p-4 md:p-6 lg:p-8 animate-in fade-in duration-305"
        >
          {/* Top sandbox telemetry navigation bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-xl">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">CRO Live-Site Fullscreen Viewport</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Interactive live simulation utilizing current generated output</p>
              </div>
            </div>

            {/* Mode selection toggle tabs */}
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 p-1 rounded-xl">
              <button
                id="fs-mode-fixed"
                onClick={() => setFullScreenMode("fixed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  fullScreenMode === "fixed"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Fixed Aspect Ratio (16:10.5)
              </button>
              <button
                id="fs-mode-fluid"
                onClick={() => setFullScreenMode("fluid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  fullScreenMode === "fluid"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Responsive Stretch (Fluid)
              </button>
            </div>

            {/* Close / Minimize Trigger */}
            <button
              id="exit-fullscreen-btn"
              onClick={() => handleFullScreenToggle(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white bg-gray-900 border border-gray-805 rounded-xl transition-all hover:bg-gray-850 cursor-pointer"
            >
              <X className="h-4 w-4" /> Exit Full Screen
            </button>
          </div>

          {/* Core Sandbox Interactive frame layout container */}
          <div className="flex-1 flex items-center justify-center overflow-auto min-h-0 bg-slate-900/40 rounded-2xl p-2">
            <div 
              id="fs-viewport-wrapper"
              className={`transition-all duration-300 shadow-2xl bg-gray-950 rounded-2xl border border-gray-800 flex flex-col overflow-hidden max-w-full ${
                fullScreenMode === "fixed"
                  ? "aspect-[16/10.5] w-full max-h-[80vh]"
                  : "w-full h-full max-h-[82vh]"
              }`}
            >
              {/* Simulated Browser Bar */}
              <div className="bg-gray-900 px-4 py-2.5 flex items-center gap-2 border-b border-gray-800 shrink-0">
                <div className="flex gap-1.5 shrink-0">
                  <span className="h-3 w-3 bg-red-500 rounded-full inline-block" />
                  <span className="h-3 w-3 bg-yellow-500 rounded-full inline-block" />
                  <span className="h-3 w-3 bg-green-500 rounded-full inline-block" />
                </div>
                <div className="bg-gray-950 text-[11px] text-gray-300 py-1 px-4 rounded-lg w-full max-w-xl mx-auto truncate text-center font-sans tracking-wide border border-gray-800 shadow-inner">
                  {targetUrl ? targetUrl.replace("https://", "") : "d2c-store.com"}
                </div>
              </div>

              {/* Scrollable document wrapper */}
              <div className="flex-1 bg-white relative">
                {data.enhanced_html ? (
                  <iframe
                    id="enhanced-html-viewport-iframe-fs"
                    srcDoc={data.enhanced_html}
                    className="w-full h-full border-0"
                    title="PageAlign Full-Screen Personalized Landing Page Preview"
                    sandbox="allow-scripts"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-gray-400 bg-gray-900">
                    <Sparkles className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                    <p className="text-sm font-medium">Reconstructing actual storefront copy alignment...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
