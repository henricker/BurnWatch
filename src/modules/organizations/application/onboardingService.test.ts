import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { completeOnboarding } from "./onboardingService";

describe("completeOnboarding", () => {
  const userId = "user-uuid-1";

  it("throws when organization name is empty after trim", async () => {
    const prisma = {
      profile: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(),
    } as unknown as PrismaClient;

    await expect(
      completeOnboarding(prisma, {
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

    await expect(
      completeOnboarding(prisma, {
        userId,
        organizationName: "",
      }),
    ).rejects.toThrow("Organization name is required.");
  });

  it("is no-op when user already has a profile", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "existing-profile",
      userId,
      organizationId: "existing-org",
      role: "MEMBER",
    });
    const transactionFn = vi.fn();

    const prisma = {
      profile: { findFirst },
      $transaction: transactionFn,
    } as unknown as PrismaClient;

    await completeOnboarding(prisma, {
      userId,
      organizationName: "New Org",
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(transactionFn).not.toHaveBeenCalled();
  });

  it("creates organization and profile with OWNER role in a transaction", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const createdOrg = { id: "new-org-id", name: "My Startup" };
    const orgCreate = vi.fn().mockResolvedValue(createdOrg);
    const profileCreate = vi.fn().mockResolvedValue({
      id: "new-profile-id",
      userId,
      organizationId: createdOrg.id,
      role: "OWNER",
    });

    const transactionFn = vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      const tx = {
        organization: { create: orgCreate },
        profile: { create: profileCreate },
      };
      await cb(tx);
    });

    const prisma = {
      profile: { findFirst },
      $transaction: transactionFn,
    } as unknown as PrismaClient;

    await completeOnboarding(prisma, {
      userId,
      organizationName: "  My Startup  ",
      firstName: "Jane",
      lastName: "Doe",
    });

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
    const profileCreate = vi.fn().mockResolvedValue({});

    const transactionFn = vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      await cb({
        organization: { create: orgCreate },
        profile: { create: profileCreate },
      });
    });

    const prisma = {
      profile: { findFirst },
      $transaction: transactionFn,
    } as unknown as PrismaClient;

    await completeOnboarding(prisma, {
      userId,
      organizationName: "Trimmed",
      avatarPath: "/bucket/avatar.png",
    });

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
