import type { PrismaClient } from "@prisma/client";

export type NextDestination = "/dashboard" | "/onboarding";

export interface CompleteAuthResult {
  next: NextDestination;
  /** Set when next is /dashboard so the caller can set locale cookie. */
  locale?: string | null;
}

async function getProfileLocale(
  prisma: PrismaClient,
  userId: string,
): Promise<string | null> {
  const profile = await prisma.profile.findFirst({
    where: { userId },
    select: { locale: true },
  });
  return profile?.locale ?? null;
}

export async function completeAuthForUser(
  prisma: PrismaClient,
  params: { userId: string; email: string },
): Promise<CompleteAuthResult> {
  const { userId, email } = params;

  const now = new Date();

  // 1) Check for a pending invite for this email (not expired).
  const invite = await prisma.organizationInvite.findFirst({
    where: {
      email,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (invite) {
    // Security: do not apply invite if user already has a profile in this org.
    const existingInOrg = await prisma.profile.findFirst({
      where: {
        userId,
        organizationId: invite.organizationId,
      },
    });
    if (existingInOrg) {
      await prisma.organizationInvite.delete({
        where: { id: invite.id },
      });
      const locale = await getProfileLocale(prisma, userId);
      return { next: "/dashboard", locale };
    }

    // Accept invite atomically: create Profile and delete invite.
    await prisma.$transaction(async (tx) => {
      await tx.profile.create({
        data: {
          userId,
          organizationId: invite.organizationId,
          role: invite.role,
        },
      });

      await tx.organizationInvite.delete({
        where: {
          id: invite.id,
        },
      });
    });

    const locale = await getProfileLocale(prisma, userId);
    return { next: "/dashboard", locale };
  }

  // 2) No invite: check if user already has a profile in any organization.
  const existingProfile = await prisma.profile.findFirst({
    where: {
      userId,
    },
  });

  if (existingProfile) {
    const locale = await getProfileLocale(prisma, userId);
    return { next: "/dashboard", locale };
  }

  return { next: "/onboarding" };
}

