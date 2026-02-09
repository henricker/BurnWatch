import { type PrismaClient, Role } from "@prisma/client";

import type { CompleteOnboardingResult } from "../../../domain/onboarding";

export class CompleteOnboardingUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(params: {
    userId: string;
    organizationName: string;
    firstName?: string;
    lastName?: string;
    avatarPath?: string | null;
  }): Promise<CompleteOnboardingResult> {
    const { userId, organizationName, firstName, lastName, avatarPath } = params;

    const name = organizationName.trim();
    if (!name) {
      throw new Error("Organization name is required.");
    }

    const existingProfile = await this.prisma.profile.findFirst({
      where: { userId },
      select: { locale: true },
    });

    if (existingProfile) {
      return { locale: existingProfile.locale ?? null };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { name } });
      const profile = await tx.profile.create({
        data: {
          userId,
          organizationId: organization.id,
          role: Role.OWNER,
          firstName: firstName?.trim() || null,
          lastName: lastName?.trim() || null,
          avatarPath: avatarPath ?? null,
        },
      });
      return profile;
    });

    return { locale: created.locale ?? null };
  }
}
