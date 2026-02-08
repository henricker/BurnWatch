import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EncryptionService } from "@/lib/security/encryption";
import {
  updateLabel,
  deleteAccount,
  CloudCredentialsNotFoundError,
  CloudCredentialsValidationError,
  CloudCredentialsError,
} from "@/modules/cloud-provider-credentials/application/cloudCredentialsService";
import { syncAccount as syncAccountAdapter, SyncNotFoundError } from "@/modules/adapter-engine/application/syncService";
import { getProfileByUserId } from "@/modules/organizations/application/profileService";

/**
 * PATCH: Update cloud account label only.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: accountId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileByUserId(prisma, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  let body: { label?: string };
  try {
    body = (await request.json()) as { label?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label : "";

  try {
    await updateLabel(prisma, profile.organizationId, accountId, label);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CloudCredentialsValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof CloudCredentialsNotFoundError) {
      return NextResponse.json({ error: "Cloud account not found" }, { status: 404 });
    }
    if (err instanceof CloudCredentialsError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

/**
 * POST: Run sync for this cloud account (Vercel: real API; AWS/GCP: mock).
 * Updates status to SYNCING, fetches data, upserts DailySpend, then SYNCED or SYNC_ERROR.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: accountId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileByUserId(prisma, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  let encryption: EncryptionService;
  try {
    encryption = EncryptionService.fromEnv();
  } catch (e) {
    if (process.env.NODE_ENV !== "test") {
      console.error("[POST /api/cloud-accounts/[id]] EncryptionService:", e);
    }
    return NextResponse.json(
      { error: "Server encryption not configured" },
      { status: 500 },
    );
  }

  try {
    const result = await syncAccountAdapter(prisma, encryption, {
      organizationId: profile.organizationId,
      accountId,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SyncNotFoundError) {
      return NextResponse.json({ error: "Cloud account not found" }, { status: 404 });
    }
    if (process.env.NODE_ENV !== "test") {
      console.error("[POST /api/cloud-accounts/[id]] sync error:", err);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}

/**
 * DELETE: Remove cloud account.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: accountId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileByUserId(prisma, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  try {
    await deleteAccount(prisma, profile.organizationId, accountId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CloudCredentialsNotFoundError) {
      return NextResponse.json({ error: "Cloud account not found" }, { status: 404 });
    }
    throw err;
  }
}
