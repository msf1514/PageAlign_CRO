import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the magic-link redirect. Supports both the PKCE `?code=` flow and the
// `?token_hash=&type=` flow, so it works regardless of the email template.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "email"
    | "magiclink"
    | "recovery"
    | "invite"
    | "signup"
    | null;
  const next = searchParams.get("next") || "/";

  const supabase = await createClient();

  let error: { message?: string } | null = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else {
    error = { message: "Missing authentication parameters." };
  }

  if (!error) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(error.message || "Sign-in failed.")}`
  );
}
