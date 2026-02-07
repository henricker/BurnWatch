import { NextResponse } from "next/server";

import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createSupabaseOtpClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInvite, InviteError } from "@/modules/organizations/application/inviteService";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { organizationId?: string; email?: string; targetRole?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { organizationId, email, targetRole } = body;
  if (!organizationId || !email?.trim()) {
    return NextResponse.json(
      { error: "organizationId and email are required" },
      { status: 400 },
    );
  }

  const role = targetRole as Role | undefined;
  if (!role || !["ADMIN", "MEMBER"].includes(role)) {
    return NextResponse.json(
      { error: "targetRole must be ADMIN or MEMBER (Owner is created only at org creation)" },
      { status: 400 },
    );
  }

  const profile = await prisma.profile.findFirst({
    where: {
      userId: user.id,
      organizationId,
    },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "You do not belong to this organization" },
      { status: 403 },
    );
  }

  // Use canonical app URL so the magic link redirect matches Supabase Redirect URL allow list.
  // Set NEXT_PUBLIC_APP_URL in .env (e.g. http://localhost:3000 or https://app.example.com).
  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    new URL(request.url).origin;
  const emailRedirectTo = `${appOrigin}/auth/callback`;

  try {
    // Use OTP client with implicit flow so the magic link redirects with #access_token=...
    // instead of ?code=..., avoiding "PKCE code verifier not found" for the invitee.
    const otpClient = createSupabaseOtpClient();
    await createInvite(prisma, otpClient, {
      adminId: user.id,
      organizationId,
      guestEmail: email.trim(),
      targetRole: role,
      emailRedirectTo,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InviteError) {
      const message = err.message;
      const isRateLimit =
        /rate limit|rate_limit|too many requests|429/i.test(message);
      return NextResponse.json(
        { error: message },
        { status: isRateLimit ? 429 : 400 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Failed to create invite.";
    if (process.env.NODE_ENV !== "test") {
      console.error("[POST /api/invites]", err);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
