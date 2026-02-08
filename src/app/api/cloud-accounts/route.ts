import { NextResponse } from "next/server";

import type { CloudProvider } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EncryptionService } from "@/lib/security/encryption";
import {
  createAccount,
  listAccounts,
  CloudCredentialsError,
  CloudCredentialsValidationError,
} from "@/modules/cloud-provider-credentials/application/cloudCredentialsService";
import { getProfileByUserId } from "@/modules/organizations/application/profileService";

/**
 * GET: List cloud accounts for the current user's organization.
 */
export async function GET() {
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

  const accounts = await listAccounts(prisma, profile.organizationId);

  return NextResponse.json({ accounts });
}

type CreateBody = {
  provider?: CloudProvider;
  label?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  token?: string;
  billingAccountId?: string;
  serviceAccountJson?: string;
};

/**
 * POST: Create a new cloud account. Validates credentials format, encrypts, saves.
 */
export async function POST(request: Request) {
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

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const provider = body.provider;
  const label = typeof body.label === "string" ? body.label : "";

  if (!provider || !["AWS", "VERCEL", "GCP"].includes(provider)) {
    return NextResponse.json(
      { error: "provider must be AWS, VERCEL, or GCP" },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {
    accessKeyId: body.accessKeyId,
    secretAccessKey: body.secretAccessKey,
    token: body.token,
    billingAccountId: body.billingAccountId,
    serviceAccountJson: body.serviceAccountJson,
  };

  let encryption: EncryptionService;
  try {
    encryption = EncryptionService.fromEnv();
  } catch (e) {
    if (process.env.NODE_ENV !== "test") {
      console.error("[POST /api/cloud-accounts] EncryptionService:", e);
    }
    return NextResponse.json(
      { error: "Server encryption not configured" },
      { status: 500 },
    );
  }

  try {
    const account = await createAccount(prisma, encryption, {
      organizationId: profile.organizationId,
      provider,
      label,
      payload,
    });
    return NextResponse.json({ account });
  } catch (err) {
    if (err instanceof CloudCredentialsValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof CloudCredentialsError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (process.env.NODE_ENV !== "test") {
      console.error("[POST /api/cloud-accounts]", err);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create account" },
      { status: 500 },
    );
  }
}
