import type { PrismaClient } from "@prisma/client";

import { canRemoveMember, isProtectedRole } from "@/lib/roles";

import type { RemoveMemberParams, RemoveMemberResult } from "../../../domain/member";
import { MemberError, MemberForbiddenError } from "../../../domain/member";

export class RemoveMemberUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(params: RemoveMemberParams): Promise<RemoveMemberResult> {
    const { requesterUserId, profileIdToRemove } = params;

    const targetProfile = await this.prisma.profile.findUnique({
      where: { id: profileIdToRemove },
      include: { organization: true },
    });

    if (!targetProfile) {
      throw new MemberError("Profile not found.");
    }

    if (isProtectedRole(targetProfile.role)) {
      throw new MemberForbiddenError("Cannot remove the organization owner.");
    }

    const requesterProfile = await this.prisma.profile.findFirst({
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

    await this.prisma.profile.delete({
      where: { id: profileIdToRemove },
    });

    return { removedUserId };
  }
}
