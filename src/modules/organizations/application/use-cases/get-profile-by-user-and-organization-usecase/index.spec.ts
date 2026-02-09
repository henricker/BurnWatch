import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { GetProfileByUserAndOrganizationUseCase } from "./index";

describe("GetProfileByUserAndOrganizationUseCase", () => {
  it("returns null when user is not in organization", async () => {
    const prisma = {
      profile: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;

    const useCase = new GetProfileByUserAndOrganizationUseCase(prisma);
    const result = await useCase.execute("user-1", "org-1");
    expect(result).toBeNull();
    expect(prisma.profile.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", organizationId: "org-1" },
      select: expect.objectContaining({
        id: true,
        organizationId: true,
        role: true,
        firstName: true,
        lastName: true,
        avatarPath: true,
        theme: true,
        locale: true,
      }),
    });
  });

  it("returns profile when user belongs to organization", async () => {
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          id: "profile-1",
          organizationId: "org-1",
          role: "MEMBER",
          firstName: "Jane",
          lastName: "Doe",
          avatarPath: "/av.png",
          theme: "dark",
          locale: "pt",
        }),
      },
    } as unknown as PrismaClient;

    const useCase = new GetProfileByUserAndOrganizationUseCase(prisma);
    const result = await useCase.execute("user-1", "org-1");
    expect(result).toEqual({
      id: "profile-1",
      organizationId: "org-1",
      role: "MEMBER",
      firstName: "Jane",
      lastName: "Doe",
      avatarPath: "/av.png",
      theme: "dark",
      locale: "pt",
    });
  });
});
