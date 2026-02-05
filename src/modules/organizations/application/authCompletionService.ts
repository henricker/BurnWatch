import type { PrismaClient } from "@prisma/client";

export type NextDestination = "/dashboard" | "/onboarding";

export interface CompleteAuthResult {
  next: NextDestination;
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
      return { next: "/dashboard" };
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

    return { next: "/dashboard" };
  }

  // 2) No invite: check if user already has a profile in any organization.
  const existingProfile = await prisma.profile.findFirst({
    where: {
      userId,
    },
  });

  if (existingProfile) {
    return { next: "/dashboard" };
  }

  return { next: "/onboarding" };
}

