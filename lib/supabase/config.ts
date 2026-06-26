// True only when both public Supabase env vars are present. Lets the CRO tool
// keep working even before Supabase is configured — the auth UI simply hides
// itself instead of crashing.
export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
