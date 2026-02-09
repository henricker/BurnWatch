import type { PrismaClient } from "@prisma/client";

import type { SyncResultDto } from "../../../domain/cloudCredentials";
import { CloudCredentialsNotFoundError } from "../../../domain/cloudCredentials";

export class RecordSyncUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(
    organizationId: string,
    accountId: string,
  ): Promise<SyncResultDto> {
    const account = await this.prisma.cloudAccount.findFirst({
      where: { id: accountId, organizationId },
    });

    if (!account) {
      throw new CloudCredentialsNotFoundError();
    }

    const updated = await this.prisma.cloudAccount.update({
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
}
