import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { UpdateOrganizationNameUseCase } from "./index";
import {
  OrganizationError,
  OrganizationForbiddenError,
  OrganizationNotFoundError,
} from "../../../domain/organization";

describe("UpdateOrganizationNameUseCase", () => {
  it("throws OrganizationError when name is empty", async () => {
    const prisma = { profile: { findFirst: vi.fn() }, organization: { update: vi.fn() } } as unknown as PrismaClient;

    const useCase = new UpdateOrganizationNameUseCase(prisma);
    await expect(
      useCase.execute("user-1", "  "),
    ).rejects.toThrow(OrganizationError);

    expect(prisma.profile.findFirst).not.toHaveBeenCalled();
  });

  it("throws OrganizationNotFoundError when profile does not exist", async () => {
    const prisma = {
      profile: { findFirst: vi.fn().mockResolvedValue(null) },
      organization: { update: vi.fn() },
    } as unknown as PrismaClient;

    const useCase = new UpdateOrganizationNameUseCase(prisma);
    await expect(
      useCase.execute("user-1", "New Name"),
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

    const useCase = new UpdateOrganizationNameUseCase(prisma);
    await expect(
      useCase.execute("user-1", "New Name"),
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

    const useCase = new UpdateOrganizationNameUseCase(prisma);
    await useCase.execute("user-1", "  Acme Corp  ");

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

    const useCase = new UpdateOrganizationNameUseCase(prisma);
    await useCase.execute("user-1", "New Name");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { name: "New Name" },
    });
  });
});
