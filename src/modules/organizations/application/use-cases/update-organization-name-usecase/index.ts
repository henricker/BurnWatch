import type { PrismaClient } from "@prisma/client";

import { canUpdateOrganizationName } from "@/lib/roles";

import {
  OrganizationError,
  OrganizationForbiddenError,
  OrganizationNotFoundError,
} from "../../../domain/organization";

export class UpdateOrganizationNameUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(userId: string, name: string): Promise<void> {
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) {
      throw new OrganizationError("name is required and must be non-empty");
    }

    const profile = await this.prisma.profile.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (!profile) {
      throw new OrganizationNotFoundError();
    }

    if (!canUpdateOrganizationName(profile.role)) {
      throw new OrganizationForbiddenError(
        "Only Owner or Admin can update organization name",
      );
    }

    await this.prisma.organization.update({
      where: { id: profile.organizationId },
      data: { name: trimmed },
    });
  }
}
