import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { DeleteOrganizationUseCase } from "./index";
import {
  OrganizationForbiddenError,
  OrganizationNotFoundError,
} from "../../../domain/organization";

describe("DeleteOrganizationUseCase", () => {
  it("throws OrganizationNotFoundError when profile does not exist", async () => {
    const prisma = {
      profile: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn() },
      organization: { delete: vi.fn() },
    } as unknown as PrismaClient;

    const useCase = new DeleteOrganizationUseCase(prisma);
    await expect(
      useCase.execute("user-1"),
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

    const useCase = new DeleteOrganizationUseCase(prisma);
    await expect(
      useCase.execute("user-1"),
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

    const useCase = new DeleteOrganizationUseCase(prisma);
    await useCase.execute("user-1", { supabaseAdmin });

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

    const useCase = new DeleteOrganizationUseCase(prisma);
    await useCase.execute("user-1");

    expect(deleteOrgMock).toHaveBeenCalledWith({
      where: { id: "org-1" },
    });
  });
});
