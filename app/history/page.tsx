"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, ExternalLink, Loader2, Inbox } from "lucide-react";
import OutputPanel from "@/components/OutputPanel";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

interface CroRun {
  id: string;
  created_at: string;
  title: string | null;
  target_url: string;
  user_vision: string | null;
  ad_creative: string | null;
  mode: string | null;
  confidence_score: number | null;
  iteration: number | null;
  scrape_method: string | null;
  original_source_is_mocked: boolean | null;
  global_adjustments: Record<string, string> | null;
  sections_optimized: unknown[] | null;
  change_log_summary: string | null;
  scraped_text_preview: string | null;
  enhanced_html: string | null;
}

type Status = "loading" | "unauth" | "ready" | "unconfigured";

export default function HistoryPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [rows, setRows] = useState<CroRun[]>([]);
  const [selected, setSelected] = useState<CroRun | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus("unconfigured");
      return;
    }
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("unauth");
        return;
      }
      const { data, error } = await supabase
        .from("cro_runs")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setRows(data as CroRun[]);
      setStatus("ready");
    })();
  }, []);

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("cro_runs").delete().eq("id", id);
    if (!error) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (selected?.id === id) setSelected(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50/50">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <header className="flex items-center justify-between border-b border-gray-200 pb-6">
          <div className="space-y-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to optimizer
            </Link>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">My runs</h1>
          </div>
        </header>

        {status === "loading" && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your saved runs...
          </div>
        )}

        {status === "unconfigured" && (
          <p className="text-sm text-gray-500">Accounts aren&apos;t configured in this environment yet.</p>
        )}

        {status === "unauth" && (
          <div className="text-sm text-gray-600 space-y-3">
            <p>You need to sign in to view your saved runs.</p>
            <Link
              href="/login"
              className="inline-flex px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
            >
              Sign in
            </Link>
          </div>
        )}

        {status === "ready" && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-gray-400">
            <Inbox className="w-8 h-8" />
            <p className="text-sm">No saved runs yet. Optimize a page and it&apos;ll show up here.</p>
            <Link
              href="/"
              className="inline-flex px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
            >
              Create one
            </Link>
          </div>
        )}

        {status === "ready" && rows.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 hover:border-blue-400 hover:shadow-xs transition"
              >
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {row.title || row.target_url}
                  </p>
                  <p className="text-[11px] text-gray-400 font-mono truncate">{row.target_url}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-500">
                  {row.mode && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                      {row.mode === "universal_cro_enhanced" ? "Precision CRO" : row.mode}
                    </span>
                  )}
                  {typeof row.confidence_score === "number" && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                      {Math.round(row.confidence_score <= 1 ? row.confidence_score * 100 : row.confidence_score)}% conf
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                    {new Date(row.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setSelected(row)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition"
                  >
                    <ExternalLink className="w-3 h-3" /> Open
                  </button>
                  <button
                    onClick={() => handleDelete(row.id)}
                    title="Delete"
                    className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-200 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className="pt-4">
            <OutputPanel
              data={{
                status: "success",
                iteration: selected.iteration ?? 0,
                mode: selected.mode ?? "universal_cro_enhanced",
                confidence_score: selected.confidence_score ?? 0,
                global_adjustments: {
                  contrast_enhancements: selected.global_adjustments?.contrast_enhancements ?? "",
                  overall_tone_applied: selected.global_adjustments?.overall_tone_applied ?? "",
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                sections_optimized: (selected.sections_optimized ?? []) as any,
                change_log_summary: selected.change_log_summary ?? "",
                original_source_is_mocked: selected.original_source_is_mocked ?? false,
                scraped_text_preview: selected.scraped_text_preview ?? "",
                enhanced_html: selected.enhanced_html ?? "",
              }}
              onReset={() => setSelected(null)}
              userVision={selected.user_vision ?? ""}
              targetUrl={selected.target_url}
              logs={[]}
            />
          </div>
        )}
      </div>
    </main>
  );
}
