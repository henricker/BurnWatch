import type { PrismaClient } from "@prisma/client";

import { CloudCredentialsNotFoundError } from "../../../domain/cloudCredentials";

export class DeleteAccountUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(organizationId: string, accountId: string): Promise<void> {
    const account = await this.prisma.cloudAccount.findFirst({
      where: { id: accountId, organizationId },
    });

    if (!account) {
      throw new CloudCredentialsNotFoundError();
    }

    await this.prisma.cloudAccount.delete({
      where: { id: accountId },
    });
  }
}
