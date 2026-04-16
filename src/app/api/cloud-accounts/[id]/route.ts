import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EncryptionService } from "@/lib/security/encryption";
import { DeleteAccountUseCase } from "@/modules/cloud-provider-credentials/application/use-cases/delete-account-usecase";
import { UpdateLabelUseCase } from "@/modules/cloud-provider-credentials/application/use-cases/update-label-usecase";
import {
  CloudCredentialsError,
  CloudCredentialsNotFoundError,
  CloudCredentialsValidationError,
} from "@/modules/cloud-provider-credentials/domain/cloudCredentials";
import {
  SyncAccountUseCase,
  SyncNotFoundError,
  SyncRateLimitError,
} from "@/modules/adapter-engine/application/use-cases/sync-account-usecase";
import { GetProfileByUserIdUseCase } from "@/modules/organizations/application/use-cases/get-profile-by-user-id-usecase";
import { TriggerAnomalyAlertAfterSyncUseCase } from "@/modules/notifications/application/use-cases/trigger-anomaly-alert-after-sync-usecase";

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

  const profileUseCase = new GetProfileByUserIdUseCase(prisma);
  const profile = await profileUseCase.execute(user.id);
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
    const updateLabelUseCase = new UpdateLabelUseCase(prisma);
    await updateLabelUseCase.execute(profile.organizationId, accountId, label);
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

  const profileUseCase = new GetProfileByUserIdUseCase(prisma);
  const profile = await profileUseCase.execute(user.id);
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
    const useCase = new SyncAccountUseCase(prisma, encryption);
    const result = await useCase.execute({
      organizationId: profile.organizationId,
      accountId,
    });
    if (result.status === "SYNCED") {
      new TriggerAnomalyAlertAfterSyncUseCase(prisma)
        .execute({ organizationId: profile.organizationId })
        .catch(() => {});
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SyncNotFoundError) {
      return NextResponse.json({ error: "Cloud account not found" }, { status: 404 });
    }
    if (err instanceof SyncRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
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

  const profileUseCase = new GetProfileByUserIdUseCase(prisma);
  const profile = await profileUseCase.execute(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  try {
    const deleteAccountUseCase = new DeleteAccountUseCase(prisma);
    await deleteAccountUseCase.execute(profile.organizationId, accountId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CloudCredentialsNotFoundError) {
      return NextResponse.json({ error: "Cloud account not found" }, { status: 404 });
    }
    throw err;
  }
}
