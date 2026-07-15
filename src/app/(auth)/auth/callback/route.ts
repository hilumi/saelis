import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Supabase auth callback: exchanges the one-time code for a session.
 * The `next` parameter is validated to be a same-origin relative path —
 * open redirects are rejected.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  let next = searchParams.get("next") ?? "/home";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    next = "/home";
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch {
      // fall through to the calm error redirect below
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?notice=link-expired`);
}
