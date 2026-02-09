import type { CloudAccount } from "@prisma/client";

/** Normalized daily spend row for upsert into DailySpend. */
export interface DailySpendData {
  date: Date;
  serviceName: string;
  amountCents: number;
  currency?: string;
}

/** Date range for fetching (ISO date strings YYYY-MM-DD). */
export interface FetchRange {
  from: string;
  to: string;
}

/** Stored in CloudAccount.lastSyncError when sync fails with a known code; UI translates by key. */
export const SYNC_ERROR_VERCEL_FORBIDDEN = "vercel-forbidden-error-sync";
export const SYNC_ERROR_AWS_INVALID_CREDENTIALS = "aws-invalid-credentials-error";
export const SYNC_ERROR_GCP_INVALID_CREDENTIALS = "gcp-invalid-credentials-error";
export const SYNC_ERROR_GCP_BILLING_EXPORT = "gcp-billing-export-error";

/** Error that carries a sync error key to store in lastSyncError instead of raw message. */
export class SyncErrorWithKey extends Error {
  constructor(
    message: string,
    public readonly syncErrorKey: string,
  ) {
    super(message);
    this.name = "SyncErrorWithKey";
  }
}

/**
 * Contract for cloud provider adapters.
 * Each provider handles its own credentials (decrypted from cloudAccount) and fetch logic.
 */
export interface ICloudProvider {
  fetchDailySpend(
    cloudAccount: CloudAccount,
    range: FetchRange,
  ): Promise<DailySpendData[]>;
}
