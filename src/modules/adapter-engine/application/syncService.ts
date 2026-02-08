import type { CloudAccount, PrismaClient } from "@prisma/client";

import { upsertDailySpend } from "@/modules/billing/application/dailySpendService";
import type { EncryptionService } from "@/lib/security/encryption";

import type { DailySpendData, ICloudProvider } from "../domain/cloudProvider";
import { SyncErrorWithKey } from "../domain/cloudProvider";
import { MockProvider } from "../infrastructure/providers/mockProvider";
import { VercelProvider } from "../infrastructure/providers/vercelProvider";

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncError";
  }
}

export class SyncNotFoundError extends SyncError {
  constructor(message: string = "Cloud account not found") {
    super(message);
    this.name = "SyncNotFoundError";
  }
}

/**
 * Default range: last 30 days (from today).
 */
function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function getProvider(
  provider: CloudAccount["provider"],
  encryption: EncryptionService,
): ICloudProvider {
  switch (provider) {
    case "VERCEL":
      return new VercelProvider(encryption);
    case "AWS":
    case "GCP":
    case "OTHER":
      return new MockProvider();
    default:
      return new MockProvider();
  }
}

export interface SyncAccountParams {
  organizationId: string;
  accountId: string;
  range?: { from: string; to: string };
}

export interface SyncAccountResult {
  lastSyncedAt: string;
  status: "SYNCED" | "SYNC_ERROR";
  lastSyncError: string | null;
  rowsUpserted: number;
}

/**
 * Orchestrates sync for a single cloud account:
 * 1. Load account, set SYNCING
 * 2. Fetch data via provider (Vercel real, AWS/GCP mock)
 * 3. Upsert DailySpend with cloudAccountId
 * 4. Set SYNCED and lastSyncedAt, or SYNC_ERROR and lastSyncError
 */
export async function syncAccount(
  prisma: PrismaClient,
  encryption: EncryptionService,
  params: SyncAccountParams,
): Promise<SyncAccountResult> {
  const { organizationId, accountId, range: rangeParam } = params;

  const account = await prisma.cloudAccount.findFirst({
    where: { id: accountId, organizationId },
  });

  if (!account) {
    throw new SyncNotFoundError();
  }

  const range = rangeParam ?? defaultRange();

  await prisma.cloudAccount.update({
    where: { id: accountId },
    data: { status: "SYNCING", lastSyncError: null },
  });

  let rowsUpserted = 0;

  try {
    const provider = getProvider(account.provider, encryption);
    const data = await provider.fetchDailySpend(account, range);

    for (const row of data) {
      const d = row.date;
      const dateOnly = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      await upsertDailySpend(prisma, {
        organizationId: account.organizationId,
        cloudAccountId: account.id,
        date: dateOnly,
        provider: account.provider,
        serviceName: row.serviceName,
        amountCents: row.amountCents,
        currency: row.currency ?? "USD",
      });
      rowsUpserted += 1;
    }

    const now = new Date();
    await prisma.cloudAccount.update({
      where: { id: accountId },
      data: {
        status: "SYNCED",
        lastSyncedAt: now,
        lastSyncError: null,
      },
    });

    return {
      lastSyncedAt: now.toISOString(),
      status: "SYNCED",
      lastSyncError: null,
      rowsUpserted,
    };
  } catch (err) {
    const lastSyncError =
      err instanceof SyncErrorWithKey ? err.syncErrorKey : (err instanceof Error ? err.message : "Sync failed");
    await prisma.cloudAccount.update({
      where: { id: accountId },
      data: {
        status: "SYNC_ERROR",
        lastSyncError,
      },
    });
    return {
      lastSyncedAt: new Date().toISOString(),
      status: "SYNC_ERROR",
      lastSyncError,
      rowsUpserted,
    };
  }
}
