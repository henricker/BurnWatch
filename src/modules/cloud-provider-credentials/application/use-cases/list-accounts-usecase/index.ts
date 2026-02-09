import type { PrismaClient } from "@prisma/client";

import type { CloudAccountDto } from "../../../domain/cloudCredentials";

export class ListAccountsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(organizationId: string): Promise<CloudAccountDto[]> {
    const accounts = await this.prisma.cloudAccount.findMany({
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
}
