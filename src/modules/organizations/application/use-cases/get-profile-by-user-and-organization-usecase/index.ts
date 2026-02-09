import type { PrismaClient } from "@prisma/client";

import type { ProfileByUserAndOrgResult } from "../../../domain/profile";

export class GetProfileByUserAndOrganizationUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(userId: string, organizationId: string): Promise<ProfileByUserAndOrgResult | null> {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, organizationId },
      select: {
        id: true,
        organizationId: true,
        role: true,
        firstName: true,
        lastName: true,
        avatarPath: true,
        theme: true,
        locale: true,
      },
    });
    if (!profile) return null;
    return {
      id: profile.id,
      organizationId: profile.organizationId,
      role: profile.role,
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      avatarPath: profile.avatarPath ?? null,
      theme: profile.theme ?? null,
      locale: profile.locale ?? null,
    };
  }
}
