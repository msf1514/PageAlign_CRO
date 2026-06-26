"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { LogOut, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  // Hidden entirely until configured / resolved, so the header doesn't flicker.
  if (!isSupabaseConfigured || !ready) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition"
      >
        <LayoutGrid className="w-3 h-3" />
        My runs
      </Link>
      <span className="hidden sm:inline text-[11px] text-gray-500 font-mono max-w-[160px] truncate">
        {user.email}
      </span>
      <button
        onClick={handleSignOut}
        title="Sign out"
        className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition"
      >
        <LogOut className="w-3 h-3" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
