import type { PrismaClient } from "@prisma/client";

import {
  CloudCredentialsNotFoundError,
  CloudCredentialsValidationError,
} from "../../../domain/cloudCredentials";

export class UpdateLabelUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(
    organizationId: string,
    accountId: string,
    label: string,
  ): Promise<void> {
    const trimmedLabel = typeof label === "string" ? label.trim() : "";
    if (!trimmedLabel) {
      throw new CloudCredentialsValidationError("label is required and must be non-empty");
    }

    const account = await this.prisma.cloudAccount.findFirst({
      where: { id: accountId, organizationId },
    });

    if (!account) {
      throw new CloudCredentialsNotFoundError();
    }

    await this.prisma.cloudAccount.update({
      where: { id: accountId },
      data: { label: trimmedLabel },
    });
  }
}
