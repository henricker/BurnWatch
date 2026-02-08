import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  updateOrganizationName,
  deleteOrganization,
  OrganizationError,
  OrganizationNotFoundError,
  OrganizationForbiddenError,
} from "./organizationService";

describe("updateOrganizationName", () => {
  it("throws OrganizationError when name is empty", async () => {
    const prisma = { profile: { findFirst: vi.fn() }, organization: { update: vi.fn() } } as unknown as PrismaClient;

    await expect(
      updateOrganizationName(prisma, "user-1", "  "),
    ).rejects.toThrow(OrganizationError);

    expect(prisma.profile.findFirst).not.toHaveBeenCalled();
  });

  it("throws OrganizationNotFoundError when profile does not exist", async () => {
    const prisma = {
      profile: { findFirst: vi.fn().mockResolvedValue(null) },
      organization: { update: vi.fn() },
    } as unknown as PrismaClient;

    await expect(
      updateOrganizationName(prisma, "user-1", "New Name"),
    ).rejects.toThrow(OrganizationNotFoundError);

    expect(prisma.organization.update).not.toHaveBeenCalled();
  });

  it("throws OrganizationForbiddenError when user is MEMBER", async () => {
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          id: "profile-1",
          userId: "user-1",
          organizationId: "org-1",
          role: "MEMBER",
          organization: { id: "org-1" },
        }),
      },
      organization: { update: vi.fn() },
    } as unknown as PrismaClient;

    await expect(
      updateOrganizationName(prisma, "user-1", "New Name"),
    ).rejects.toThrow(OrganizationForbiddenError);

    expect(prisma.organization.update).not.toHaveBeenCalled();
  });

  it("updates organization name when user is OWNER", async () => {
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          id: "profile-1",
          userId: "user-1",
          organizationId: "org-1",
          role: "OWNER",
          organization: { id: "org-1" },
        }),
      },
      organization: { update: updateMock },
    } as unknown as PrismaClient;

    await updateOrganizationName(prisma, "user-1", "  Acme Corp  ");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { name: "Acme Corp" },
    });
  });

  it("updates organization name when user is ADMIN", async () => {
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          id: "profile-1",
          userId: "user-1",
          organizationId: "org-1",
          role: "ADMIN",
          organization: { id: "org-1" },
        }),
      },
      organization: { update: updateMock },
    } as unknown as PrismaClient;

    await updateOrganizationName(prisma, "user-1", "New Name");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { name: "New Name" },
    });
  });
});

describe("deleteOrganization", () => {
  it("throws OrganizationNotFoundError when profile does not exist", async () => {
    const prisma = {
      profile: { findFirst: vi.fn().mockResolvedValue(null) },
      profileFindMany: vi.fn(),
      organization: { delete: vi.fn() },
    } as unknown as PrismaClient;

    await expect(
      deleteOrganization(prisma, "user-1"),
    ).rejects.toThrow(OrganizationNotFoundError);
  });

  it("throws OrganizationForbiddenError when user is not OWNER", async () => {
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          id: "profile-1",
          userId: "user-1",
          organizationId: "org-1",
          role: "ADMIN",
          organization: { id: "org-1" },
        }),
      },
      organization: { delete: vi.fn() },
    } as unknown as PrismaClient;

    await expect(
      deleteOrganization(prisma, "user-1"),
    ).rejects.toThrow(OrganizationForbiddenError);

    expect(prisma.organization.delete).not.toHaveBeenCalled();
  });

  it("deletes organization and optionally revokes auth users", async () => {
    const deleteOrgMock = vi.fn().mockResolvedValue(undefined);
    const findManyMock = vi.fn().mockResolvedValue([
      { userId: "user-1" },
      { userId: "user-2" },
    ]);
    const deleteUserMock = vi.fn().mockResolvedValue({ error: null });
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          id: "profile-1",
          userId: "user-1",
          organizationId: "org-1",
          role: "OWNER",
          organization: { id: "org-1" },
        }),
        findMany: findManyMock,
      },
      organization: { delete: deleteOrgMock },
    } as unknown as PrismaClient;

    const supabaseAdmin = {
      auth: { admin: { deleteUser: deleteUserMock } },
    };

    await deleteOrganization(prisma, "user-1", { supabaseAdmin });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      select: { userId: true },
    });
    expect(deleteUserMock).toHaveBeenCalledTimes(2);
    expect(deleteUserMock).toHaveBeenCalledWith("user-1");
    expect(deleteUserMock).toHaveBeenCalledWith("user-2");
    expect(deleteOrgMock).toHaveBeenCalledWith({
      where: { id: "org-1" },
    });
  });

  it("deletes organization without supabaseAdmin (skips auth delete)", async () => {
    const deleteOrgMock = vi.fn().mockResolvedValue(undefined);
    const findManyMock = vi.fn().mockResolvedValue([{ userId: "user-1" }]);
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          id: "profile-1",
          userId: "user-1",
          organizationId: "org-1",
          role: "OWNER",
          organization: { id: "org-1" },
        }),
        findMany: findManyMock,
      },
      organization: { delete: deleteOrgMock },
    } as unknown as PrismaClient;

    await deleteOrganization(prisma, "user-1");

    expect(deleteOrgMock).toHaveBeenCalledWith({
      where: { id: "org-1" },
    });
  });
});
