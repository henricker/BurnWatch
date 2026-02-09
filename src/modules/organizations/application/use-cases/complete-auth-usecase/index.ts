import type { PrismaClient } from "@prisma/client";

import type { CompleteAuthResult } from "../../../domain/authCompletion";

export class CompleteAuthUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(params: { userId: string; email: string }): Promise<CompleteAuthResult> {
    const { userId, email } = params;

    const now = new Date();

    const invite = await this.prisma.organizationInvite.findFirst({
      where: { email, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
    });

    if (invite) {
      const existingInOrg = await this.prisma.profile.findFirst({
        where: { userId, organizationId: invite.organizationId },
      });
      if (existingInOrg) {
        await this.prisma.organizationInvite.delete({ where: { id: invite.id } });
        const locale = await this.getProfileLocale(userId);
        return { next: "/dashboard", locale };
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.profile.create({
          data: {
            userId,
            organizationId: invite.organizationId,
            role: invite.role,
          },
        });
        await tx.organizationInvite.delete({ where: { id: invite.id } });
      });

      const locale = await this.getProfileLocale(userId);
      return { next: "/dashboard", locale };
    }

    const existingProfile = await this.prisma.profile.findFirst({
      where: { userId },
    });

    if (existingProfile) {
      const locale = await this.getProfileLocale(userId);
      return { next: "/dashboard", locale };
    }

    return { next: "/onboarding" };
  }

  private async getProfileLocale(userId: string): Promise<string | null> {
    const profile = await this.prisma.profile.findFirst({
      where: { userId },
      select: { locale: true },
    });
    return profile?.locale ?? null;
  }
}
