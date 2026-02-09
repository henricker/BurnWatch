import type { CloudAccount, PrismaClient } from "@prisma/client";

import { UpsertDailySpendBulkUseCase } from "@/modules/billing/application/use-cases/upsert-daily-spend-bulk-usecase";
import type { EncryptionService } from "@/lib/security/encryption";

import type { ICloudProvider } from "../../../domain/cloudProvider";
import { SyncErrorWithKey } from "../../../domain/cloudProvider";
import type { SyncAccountParams, SyncAccountResult } from "../../../domain/sync";
import { SyncNotFoundError } from "../../../domain/sync";
import { MockProvider } from "../../../infrastructure/providers/mockProvider";
import { AwsProvider } from "../../../infrastructure/providers/awsProvider";
import { VercelProvider } from "../../../infrastructure/providers/vercelProvider";

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUTC(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

const DEFAULT_BACKFILL_DAYS = 7;

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
      return new AwsProvider(encryption);
    case "GCP":
    case "OTHER":
      return new MockProvider();
    default:
      return new MockProvider();
  }
}

/**
 * Syncs a single cloud account (day-by-day backfill, upsert DailySpend).
 */
export class SyncAccountUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(params: SyncAccountParams): Promise<SyncAccountResult> {
    const { organizationId, accountId } = params;

    const account = await this.prisma.cloudAccount.findFirst({
      where: { id: accountId, organizationId },
    });

    if (!account) {
      throw new SyncNotFoundError();
    }

    await this.prisma.cloudAccount.update({
      where: { id: accountId },
      data: { status: "SYNCING", lastSyncError: null },
    });

    let rowsUpserted = 0;
    const upsertBulkUseCase = new UpsertDailySpendBulkUseCase(this.prisma);

    try {
      const provider = getProvider(account.provider, this.encryption);
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
        rowsUpserted += await upsertBulkUseCase.execute(dayInputs);

        cursor = addDaysUTC(cursor, 1);
      }

      await this.prisma.cloudAccount.update({
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
      await this.prisma.cloudAccount.update({
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
}

export { SyncNotFoundError } from "../../../domain/sync";
export type { SyncAccountParams, SyncAccountResult } from "../../../domain/sync";
