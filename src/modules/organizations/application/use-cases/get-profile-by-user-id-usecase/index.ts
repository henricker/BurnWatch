import type { PrismaClient } from "@prisma/client";

import type { ProfileByUserIdResult } from "../../../domain/profile";

export class GetProfileByUserIdUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(userId: string): Promise<ProfileByUserIdResult | null> {
    const profile = await this.prisma.profile.findFirst({
      where: { userId },
      select: { id: true, organizationId: true, role: true, locale: true },
    });
    if (!profile) return null;
    return {
      id: profile.id,
      organizationId: profile.organizationId,
      role: profile.role,
      locale: profile.locale ?? null,
    };
  }
}
