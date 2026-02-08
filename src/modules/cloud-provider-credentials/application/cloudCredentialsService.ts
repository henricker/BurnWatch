import type { CloudAccountStatus, CloudProvider, PrismaClient } from "@prisma/client";

import type { EncryptionService } from "@/lib/security/encryption";

import {
  credentialsToPlaintext,
  validateCredentials,
} from "../util/cloud-credentials";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class CloudCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudCredentialsError";
  }
}

export class CloudCredentialsNotFoundError extends CloudCredentialsError {
  constructor(message: string = "Cloud account not found") {
    super(message);
    this.name = "CloudCredentialsNotFoundError";
  }
}

export class CloudCredentialsValidationError extends CloudCredentialsError {
  constructor(message: string) {
    super(message);
    this.name = "CloudCredentialsValidationError";
  }
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface CloudAccountDto {
  id: string;
  provider: CloudProvider;
  label: string;
  status: CloudAccountStatus;
  lastSyncError: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncResultDto {
  lastSyncedAt: string | null;
  status: CloudAccountStatus;
  lastSyncError: string | null;
}

// ---------------------------------------------------------------------------
// listAccounts
// ---------------------------------------------------------------------------

/**
 * Lists cloud accounts for an organization (no auth check; caller must ensure organizationId is valid for the user).
 */
export async function listAccounts(
  prisma: PrismaClient,
  organizationId: string,
): Promise<CloudAccountDto[]> {
  const accounts = await prisma.cloudAccount.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      provider: true,
      label: true,
      status: true,
      lastSyncError: true,
      lastSyncedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return accounts.map((a) => ({
    id: a.id,
    provider: a.provider,
    label: a.label,
    status: a.status,
    lastSyncError: a.lastSyncError ?? null,
    lastSyncedAt: a.lastSyncedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// createAccount
// ---------------------------------------------------------------------------

export interface CreateAccountParams {
  organizationId: string;
  provider: CloudProvider;
  label: string;
  /** Raw payload (accessKeyId/secretAccessKey, token, or billingAccountId/serviceAccountJson). */
  payload: Record<string, unknown>;
}

/**
 * Validates credentials format, encrypts them, and creates a cloud account.
 * Sets lastSyncedAt to now (no real sync).
 */
export async function createAccount(
  prisma: PrismaClient,
  encryption: EncryptionService,
  params: CreateAccountParams,
): Promise<CloudAccountDto> {
  const { organizationId, provider, label, payload } = params;

  const supported: CloudProvider[] = ["AWS", "VERCEL", "GCP"];
  if (!supported.includes(provider)) {
    throw new CloudCredentialsValidationError("provider must be AWS, VERCEL, or GCP");
  }

  const trimmedLabel = typeof label === "string" ? label.trim() : "";
  if (!trimmedLabel) {
    throw new CloudCredentialsValidationError("label is required and must be non-empty");
  }

  const validation = validateCredentials(provider, payload);
  if (!validation.ok) {
    throw new CloudCredentialsValidationError(validation.error);
  }

  const plaintext = credentialsToPlaintext(provider, payload);
  const encryptedCredentials = encryption.encrypt(plaintext);

  const account = await prisma.cloudAccount.create({
    data: {
      organizationId,
      provider,
      label: trimmedLabel,
      encryptedCredentials,
      // lastSyncedAt left null so the first sync does a 7-day backfill
    },
    select: {
      id: true,
      provider: true,
      label: true,
      status: true,
      lastSyncError: true,
      lastSyncedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    id: account.id,
    provider: account.provider,
    label: account.label,
    status: account.status,
    lastSyncError: account.lastSyncError ?? null,
    lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// updateLabel
// ---------------------------------------------------------------------------

/**
 * Updates only the label of a cloud account. Account must belong to the given organization.
 */
export async function updateLabel(
  prisma: PrismaClient,
  organizationId: string,
  accountId: string,
  label: string,
): Promise<void> {
  const trimmedLabel = typeof label === "string" ? label.trim() : "";
  if (!trimmedLabel) {
    throw new CloudCredentialsValidationError("label is required and must be non-empty");
  }

  const account = await prisma.cloudAccount.findFirst({
    where: { id: accountId, organizationId },
  });

  if (!account) {
    throw new CloudCredentialsNotFoundError();
  }

  await prisma.cloudAccount.update({
    where: { id: accountId },
    data: { label: trimmedLabel },
  });
}

// ---------------------------------------------------------------------------
// syncAccount (mock: just updates lastSyncedAt and status)
// ---------------------------------------------------------------------------

/**
 * Records a sync: updates lastSyncedAt, sets status to SYNCED, clears lastSyncError.
 * Account must belong to the given organization.
 */
export async function syncAccount(
  prisma: PrismaClient,
  organizationId: string,
  accountId: string,
): Promise<SyncResultDto> {
  const account = await prisma.cloudAccount.findFirst({
    where: { id: accountId, organizationId },
  });

  if (!account) {
    throw new CloudCredentialsNotFoundError();
  }

  const updated = await prisma.cloudAccount.update({
    where: { id: accountId },
    data: {
      lastSyncedAt: new Date(),
      status: "SYNCED",
      lastSyncError: null,
    },
    select: { lastSyncedAt: true, status: true, lastSyncError: true },
  });

  return {
    lastSyncedAt: updated.lastSyncedAt?.toISOString() ?? null,
    status: updated.status,
    lastSyncError: updated.lastSyncError ?? null,
  };
}

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------

/**
 * Deletes a cloud account. Account must belong to the given organization.
 */
export async function deleteAccount(
  prisma: PrismaClient,
  organizationId: string,
  accountId: string,
): Promise<void> {
  const account = await prisma.cloudAccount.findFirst({
    where: { id: accountId, organizationId },
  });

  if (!account) {
    throw new CloudCredentialsNotFoundError();
  }

  await prisma.cloudAccount.delete({
    where: { id: accountId },
  });
}
