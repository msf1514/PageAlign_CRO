"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Mail, CheckCircle2, AlertCircle, ArrowLeft, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Surface any error passed back from the auth callback.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) setError(err);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send the magic link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50/50">
      <div className="w-full max-w-sm space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>

        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-gray-900 tracking-tight flex items-center gap-1">
              PageAlign CRO <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            </h1>
            <p className="text-xs text-gray-500">Sign in to save your optimization runs</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {!isSupabaseConfigured ? (
            <div className="flex items-start gap-2.5 text-xs text-gray-600">
              <AlertCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                Sign-in isn&apos;t configured in this environment. Add your Supabase URL and anon
                key to enable accounts.
              </span>
            </div>
          ) : sent ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-semibold">Check your inbox</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                We sent a magic link to <span className="text-gray-800 font-medium">{email}</span>.
                Click it on this device to finish signing in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wide text-gray-700">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3.5 py-2.5 bg-white border border-gray-250 rounded-xl text-sm placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 font-medium transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-100 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-red-700 leading-relaxed">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/15 flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles className="h-4 w-4" />
                {loading ? "Sending link..." : "Send magic link"}
              </button>

              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                No password needed — we&apos;ll email you a one-time sign-in link.
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
