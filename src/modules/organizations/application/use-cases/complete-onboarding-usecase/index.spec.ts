import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { CompleteOnboardingUseCase } from "./index";

describe("CompleteOnboardingUseCase", () => {
  const userId = "user-uuid-1";

  it("throws when organization name is empty after trim", async () => {
    const prisma = {
      profile: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(),
    } as unknown as PrismaClient;

    const useCase = new CompleteOnboardingUseCase(prisma);
    await expect(
      useCase.execute({
        userId,
        organizationName: "   ",
      }),
    ).rejects.toThrow("Organization name is required.");

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws when organization name is empty string", async () => {
    const prisma = {
      profile: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(),
    } as unknown as PrismaClient;

    const useCase = new CompleteOnboardingUseCase(prisma);
    await expect(
      useCase.execute({
        userId,
        organizationName: "",
      }),
    ).rejects.toThrow("Organization name is required.");
  });

  it("is no-op when user already has a profile and returns existing locale", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "existing-profile",
      userId,
      organizationId: "existing-org",
      role: "MEMBER",
      locale: "en",
    });
    const transactionFn = vi.fn();

    const prisma = {
      profile: { findFirst },
      $transaction: transactionFn,
    } as unknown as PrismaClient;

    const useCase = new CompleteOnboardingUseCase(prisma);
    const result = await useCase.execute({
      userId,
      organizationName: "New Org",
    });

    expect(result).toEqual({ locale: "en" });
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId },
      select: { locale: true },
    });
    expect(transactionFn).not.toHaveBeenCalled();
  });

  it("creates organization and profile with OWNER role in a transaction and returns locale", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const createdOrg = { id: "new-org-id", name: "My Startup" };
    const createdProfile = {
      id: "new-profile-id",
      userId,
      organizationId: createdOrg.id,
      role: "OWNER",
      locale: "pt",
    };
    const orgCreate = vi.fn().mockResolvedValue(createdOrg);
    const profileCreate = vi.fn().mockResolvedValue(createdProfile);

    const transactionFn = vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        organization: { create: orgCreate },
        profile: { create: profileCreate },
      };
      return await cb(tx);
    });

    const prisma = {
      profile: { findFirst },
      $transaction: transactionFn,
    } as unknown as PrismaClient;

    const useCase = new CompleteOnboardingUseCase(prisma);
    const result = await useCase.execute({
      userId,
      organizationName: "  My Startup  ",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result).toEqual({ locale: "pt" });
    expect(transactionFn).toHaveBeenCalledTimes(1);
    expect(orgCreate).toHaveBeenCalledWith({
      data: { name: "My Startup" },
    });
    expect(profileCreate).toHaveBeenCalledWith({
      data: {
        userId,
        organizationId: createdOrg.id,
        role: "OWNER",
        firstName: "Jane",
        lastName: "Doe",
        avatarPath: null,
      },
    });
  });

  it("trims organization name and passes optional avatarPath", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const createdOrg = { id: "org-1", name: "Trimmed" };
    const orgCreate = vi.fn().mockResolvedValue(createdOrg);
    const profileCreate = vi.fn().mockResolvedValue({
      id: "p1",
      userId,
      organizationId: createdOrg.id,
      role: "OWNER",
      locale: "en",
    });

    const transactionFn = vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return await cb({
        organization: { create: orgCreate },
        profile: { create: profileCreate },
      });
    });

    const prisma = {
      profile: { findFirst },
      $transaction: transactionFn,
    } as unknown as PrismaClient;

    const useCase = new CompleteOnboardingUseCase(prisma);
    const result = await useCase.execute({
      userId,
      organizationName: "Trimmed",
      avatarPath: "/bucket/avatar.png",
    });

    expect(result.locale).toBe("en");
    expect(profileCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        organizationId: createdOrg.id,
        role: "OWNER",
        avatarPath: "/bucket/avatar.png",
        firstName: null,
        lastName: null,
      }),
    });
  });
});
