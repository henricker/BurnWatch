import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { GetProfileByUserIdUseCase } from "./index";

describe("GetProfileByUserIdUseCase", () => {
  it("returns null when no profile exists", async () => {
    const prisma = {
      profile: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;

    const useCase = new GetProfileByUserIdUseCase(prisma);
    const result = await useCase.execute("user-1");
    expect(result).toBeNull();
    expect(prisma.profile.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { id: true, organizationId: true, role: true, locale: true },
    });
  });

  it("returns profile summary when profile exists", async () => {
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          id: "profile-1",
          organizationId: "org-1",
          role: "OWNER",
          locale: "en",
        }),
      },
    } as unknown as PrismaClient;

    const useCase = new GetProfileByUserIdUseCase(prisma);
    const result = await useCase.execute("user-1");
    expect(result).toEqual({
      id: "profile-1",
      organizationId: "org-1",
      role: "OWNER",
      locale: "en",
    });
  });
});
