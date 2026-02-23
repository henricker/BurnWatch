/**
 * Domain errors and DTOs for sync use case.
 */

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

export class SyncRateLimitError extends SyncError {
  constructor(message: string = "Manual sync is limited on your plan. Try again later or upgrade to Pro.") {
    super(message);
    this.name = "SyncRateLimitError";
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
