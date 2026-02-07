import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  removeMember,
  MemberError,
  MemberForbiddenError,
} from "./memberService";

function createPrismaMock(overrides: {
  targetProfile?: object | null;
  requesterProfile?: object | null;
  deleteProfile?: ReturnType<typeof vi.fn>;
} = {}) {
  const {
    targetProfile = null,
    requesterProfile = null,
    deleteProfile = vi.fn().mockResolvedValue(undefined),
  } = overrides;

  const findUnique = vi.fn().mockResolvedValue(targetProfile);
  const findFirst = vi.fn().mockResolvedValue(requesterProfile);

  return {
    profile: {
      findUnique,
      findFirst,
      delete: deleteProfile,
    },
  } as unknown as PrismaClient;
}

describe("removeMember", () => {
  const requesterUserId = "owner-uuid";
  const profileIdToRemove = "profile-to-remove-uuid";
  const orgId = "org-uuid";

  it("throws MemberError when profile to remove does not exist", async () => {
    const prisma = createPrismaMock({ targetProfile: null });

    await expect(
      removeMember(prisma, { requesterUserId, profileIdToRemove }),
    ).rejects.toThrow(MemberError);

    expect(prisma.profile.findUnique).toHaveBeenCalledWith({
      where: { id: profileIdToRemove },
      include: { organization: true },
    });
  });

  it("throws MemberForbiddenError when target profile is OWNER", async () => {
    const prisma = createPrismaMock({
      targetProfile: {
        id: profileIdToRemove,
        userId: "some-owner",
        organizationId: orgId,
        role: "OWNER",
        organization: { id: orgId },
      },
    });

    await expect(
      removeMember(prisma, { requesterUserId, profileIdToRemove }),
    ).rejects.toThrow(MemberForbiddenError);

    expect(prisma.profile.delete).not.toHaveBeenCalled();
  });

  it("throws MemberForbiddenError when requester does not belong to organization", async () => {
    const prisma = createPrismaMock({
      targetProfile: {
        id: profileIdToRemove,
        userId: "member-uuid",
        organizationId: orgId,
        role: "MEMBER",
        organization: { id: orgId },
      },
      requesterProfile: null,
    });

    await expect(
      removeMember(prisma, { requesterUserId, profileIdToRemove }),
    ).rejects.toThrow(MemberForbiddenError);

    expect(prisma.profile.delete).not.toHaveBeenCalled();
  });

  it("throws MemberForbiddenError when requester is MEMBER (only OWNER or ADMIN can remove)", async () => {
    const prisma = createPrismaMock({
      targetProfile: {
        id: profileIdToRemove,
        userId: "other-member",
        organizationId: orgId,
        role: "MEMBER",
        organization: { id: orgId },
      },
      requesterProfile: {
        id: "requester-profile",
        userId: requesterUserId,
        organizationId: orgId,
        role: "MEMBER",
      },
    });

    await expect(
      removeMember(prisma, { requesterUserId, profileIdToRemove }),
    ).rejects.toThrow(MemberForbiddenError);

    expect(prisma.profile.delete).not.toHaveBeenCalled();
  });

  it("deletes profile when OWNER removes a MEMBER", async () => {
    const deleteProfile = vi.fn().mockResolvedValue(undefined);
    const prisma = createPrismaMock({
      targetProfile: {
        id: profileIdToRemove,
        userId: "member-uuid",
        organizationId: orgId,
        role: "MEMBER",
        organization: { id: orgId },
      },
      requesterProfile: {
        id: "owner-profile",
        userId: requesterUserId,
        organizationId: orgId,
        role: "OWNER",
      },
      deleteProfile,
    });

    await removeMember(prisma, { requesterUserId, profileIdToRemove });

    expect(deleteProfile).toHaveBeenCalledWith({
      where: { id: profileIdToRemove },
    });
  });

  it("deletes profile when ADMIN removes a MEMBER", async () => {
    const deleteProfile = vi.fn().mockResolvedValue(undefined);
    const prisma = createPrismaMock({
      targetProfile: {
        id: profileIdToRemove,
        userId: "member-uuid",
        organizationId: orgId,
        role: "MEMBER",
        organization: { id: orgId },
      },
      requesterProfile: {
        id: "admin-profile",
        userId: requesterUserId,
        organizationId: orgId,
        role: "ADMIN",
      },
      deleteProfile,
    });

    await removeMember(prisma, { requesterUserId, profileIdToRemove });

    expect(deleteProfile).toHaveBeenCalledWith({
      where: { id: profileIdToRemove },
    });
  });
});
