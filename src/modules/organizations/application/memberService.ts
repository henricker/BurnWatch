import type { PrismaClient } from "@prisma/client";

import { canRemoveMember, isProtectedRole } from "@/lib/roles";

export class MemberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemberError";
  }
}

export class MemberForbiddenError extends MemberError {
  constructor(message: string) {
    super(message);
    this.name = "MemberForbiddenError";
  }
}

export interface RemoveMemberParams {
  /** User id of the requester (must be OWNER or ADMIN in the org). */
  requesterUserId: string;
  /** Profile id to remove (must not be OWNER). */
  profileIdToRemove: string;
}

export interface RemoveMemberResult {
  /** Supabase auth user id of the removed member (for revoking auth). */
  removedUserId: string;
}

/**
 * Removes a member from the organization.
 * - Requester must be OWNER or ADMIN in the same org as the target profile.
 * - Cannot remove a profile with role OWNER.
 * Returns the removed profile's userId so the caller can revoke Supabase Auth.
 */
export async function removeMember(
  prisma: PrismaClient,
  params: RemoveMemberParams,
): Promise<RemoveMemberResult> {
  const { requesterUserId, profileIdToRemove } = params;

  const targetProfile = await prisma.profile.findUnique({
    where: { id: profileIdToRemove },
    include: { organization: true },
  });

  if (!targetProfile) {
    throw new MemberError("Profile not found.");
  }

  if (isProtectedRole(targetProfile.role)) {
    throw new MemberForbiddenError("Cannot remove the organization owner.");
  }

  const requesterProfile = await prisma.profile.findFirst({
    where: {
      userId: requesterUserId,
      organizationId: targetProfile.organizationId,
    },
  });

  if (!requesterProfile) {
    throw new MemberForbiddenError("You do not belong to this organization.");
  }

  if (!canRemoveMember(requesterProfile.role)) {
    throw new MemberForbiddenError("Only Owner or Admin can remove members.");
  }

  const removedUserId = targetProfile.userId;

  await prisma.profile.delete({
    where: { id: profileIdToRemove },
  });

  return { removedUserId };
}
