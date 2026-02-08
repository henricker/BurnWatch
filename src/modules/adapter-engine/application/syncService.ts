import type { CloudAccount, PrismaClient } from "@prisma/client";

import { upsertDailySpendBulk } from "@/modules/billing/application/dailySpendService";
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

/** Format date as YYYY-MM-DD (UTC). */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Start of day in UTC (00:00:00.000). */
function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Add n days in UTC. */
function addDaysUTC(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

const DEFAULT_BACKFILL_DAYS = 7;

/**
 * First day to sync (start of day UTC). If never synced, use today minus DEFAULT_BACKFILL_DAYS; else start of day of lastSyncedAt (re-sync that day and up to today).
 */
function getSyncCursorStart(lastSyncedAt: Date | null): Date {
  const now = new Date();
  const todayStart = startOfDayUTC(now);
  if (!lastSyncedAt) {
    return addDaysUTC(todayStart, -DEFAULT_BACKFILL_DAYS);
  }
  return startOfDayUTC(lastSyncedAt);
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
 * Orchestrates sync for a single cloud account with day-by-day backfill:
 * 1. Load account, set SYNCING
 * 2. Determine cursor: lastSyncedAt ? start of that day : today - 7 days
 * 3. For each day from cursor to today (inclusive), fetch that day's range, upsert DailySpend
 * 4. After all days, set SYNCED and lastSyncedAt (or SYNC_ERROR on failure)
 */
export async function syncAccount(
  prisma: PrismaClient,
  encryption: EncryptionService,
  params: SyncAccountParams,
): Promise<SyncAccountResult> {
  const { organizationId, accountId } = params;

  const account = await prisma.cloudAccount.findFirst({
    where: { id: accountId, organizationId },
  });

  if (!account) {
    throw new SyncNotFoundError();
  }

  await prisma.cloudAccount.update({
    where: { id: accountId },
    data: { status: "SYNCING", lastSyncError: null },
  });

  let rowsUpserted = 0;

  try {
    const provider = getProvider(account.provider, encryption);
    const now = new Date();
    const todayStart = startOfDayUTC(now);
    let cursor = getSyncCursorStart(account.lastSyncedAt);

    while (cursor <= todayStart) {
      const from = toDateString(cursor);
      const to = toDateString(addDaysUTC(cursor, 1));
      const data = await provider.fetchDailySpend(account, { from, to });

      const dayInputs = data.map((row) => {
        const d = row.date;
        const dateOnly = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        return {
          organizationId: account.organizationId,
          cloudAccountId: account.id,
          date: dateOnly,
          provider: account.provider,
          serviceName: row.serviceName,
          amountCents: row.amountCents,
          currency: row.currency ?? "USD",
        };
      });
      rowsUpserted += await upsertDailySpendBulk(prisma, dayInputs);

      cursor = addDaysUTC(cursor, 1);
    }

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
