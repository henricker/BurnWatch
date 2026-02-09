import type { CloudAccountStatus, CloudProvider } from "@prisma/client";

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

export interface CreateAccountParams {
  organizationId: string;
  provider: CloudProvider;
  label: string;
  payload: Record<string, unknown>;
}
