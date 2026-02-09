import type { PrismaClient } from "@prisma/client";

import type { EncryptionService } from "@/lib/security/encryption";

import type { CloudAccountDto, CreateAccountParams } from "../../../domain/cloudCredentials";
import { CloudCredentialsValidationError } from "../../../domain/cloudCredentials";
import {
  credentialsToPlaintext,
  validateCredentials,
} from "../../../util/cloud-credentials";

export class CreateAccountUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(params: CreateAccountParams): Promise<CloudAccountDto> {
    const { organizationId, provider, label, payload } = params;

    const supported = ["AWS", "VERCEL", "GCP"] as const;
    if (!supported.includes(provider as (typeof supported)[number])) {
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
    const encryptedCredentials = this.encryption.encrypt(plaintext);

    const account = await this.prisma.cloudAccount.create({
      data: {
        organizationId,
        provider,
        label: trimmedLabel,
        encryptedCredentials,
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
}
