import { type PrismaClient, Role } from "@prisma/client";

export async function completeOnboarding(
  prisma: PrismaClient,
  params: {
    userId: string;
    organizationName: string;
    firstName?: string;
    lastName?: string;
    avatarPath?: string | null;
  },
): Promise<void> {
  const { userId, organizationName, firstName, lastName, avatarPath } = params;

  const name = organizationName.trim();
  if (!name) {
    throw new Error("Organization name is required.");
  }

  // Prevent duplicate onboarding: if user already has a profile, just no-op.
  const existingProfile = await prisma.profile.findFirst({
    where: {
      userId,
    },
  });

  if (existingProfile) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name,
      },
    });

    await tx.profile.create({
      data: {
        userId,
        organizationId: organization.id,
        role: Role.OWNER,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        avatarPath: avatarPath ?? null,
      },
    });
  });
}

