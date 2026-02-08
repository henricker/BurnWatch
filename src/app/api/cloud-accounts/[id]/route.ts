import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  updateLabel,
  syncAccount,
  deleteAccount,
  CloudCredentialsNotFoundError,
  CloudCredentialsValidationError,
  CloudCredentialsError,
} from "@/modules/cloud-provider-credentials/application/cloudCredentialsService";
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
 * POST: Record a sync (updates lastSyncedAt). Mock; real sync can be added later.
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

  try {
    const result = await syncAccount(prisma, profile.organizationId, accountId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CloudCredentialsNotFoundError) {
      return NextResponse.json({ error: "Cloud account not found" }, { status: 404 });
    }
    throw err;
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
