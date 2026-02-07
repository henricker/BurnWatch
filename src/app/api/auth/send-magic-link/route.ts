import { NextResponse } from "next/server";

import { createSupabaseOtpClient } from "@/lib/supabase/admin";

/**
 * Sends a magic link for conventional login using the same implicit flow as invites.
 * The link redirects with #access_token=... so the callback does not need a PKCE verifier.
 */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json(
      { error: "email is required" },
      { status: 400 },
    );
  }

  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    new URL(request.url).origin;
  const emailRedirectTo = `${appOrigin}/auth/callback`;

  const otpClient = createSupabaseOtpClient();
  const { error } = await otpClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });

  if (error) {
    const isRateLimit =
      /rate limit|rate_limit|too many requests|429/i.test(error.message);
    return NextResponse.json(
      { error: error.message },
      { status: isRateLimit ? 429 : 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
