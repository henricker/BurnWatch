import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { CompleteAuthUseCase } from "./index";

describe("CompleteAuthUseCase", () => {
  const userId = "user-uuid-1";
  const email = "guest@example.com";
  const orgId = "org-uuid-1";

  it("returns /onboarding when no invite and no existing profile", async () => {
    const findFirstInvite = vi.fn().mockResolvedValue(null);
    const findFirstProfile = vi.fn().mockResolvedValue(null);

    const prisma = {
      organizationInvite: {
        findFirst: findFirstInvite,
        delete: vi.fn(),
      },
      profile: {
        findFirst: findFirstProfile,
      },
      $transaction: vi.fn(),
    } as unknown as PrismaClient;

    const useCase = new CompleteAuthUseCase(prisma);
    const result = await useCase.execute({ userId, email });

    expect(result).toEqual({ next: "/onboarding" });
    expect(findFirstInvite).toHaveBeenCalledWith({
      where: {
        email,
        expiresAt: { gt: expect.any(Date) },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(findFirstProfile).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns /dashboard when no invite but user has existing profile", async () => {
    const findFirstInvite = vi.fn().mockResolvedValue(null);
    const findFirstProfile = vi.fn().mockResolvedValue({
      id: "profile-1",
      userId,
      organizationId: "other-org",
      role: "MEMBER",
    });

    const prisma = {
      organizationInvite: { findFirst: findFirstInvite, delete: vi.fn() },
      profile: { findFirst: findFirstProfile },
      $transaction: vi.fn(),
    } as unknown as PrismaClient;

    const useCase = new CompleteAuthUseCase(prisma);
    const result = await useCase.execute({ userId, email });

    expect(result.next).toBe("/dashboard");
    expect(result.locale).toBeDefined();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("accepts invite and returns /dashboard when pending invite exists", async () => {
    const invite = {
      id: "invite-id",
      organizationId: orgId,
      email,
      role: "MEMBER" as const,
      expiresAt: new Date(Date.now() + 86400000),
    };

    const findFirstInvite = vi.fn().mockResolvedValue(invite);
    const findFirstProfileInOrg = vi.fn().mockResolvedValue(null);
    const transactionFn = vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      const tx = {
        profile: { create: vi.fn().mockResolvedValue({}) },
        organizationInvite: { delete: vi.fn().mockResolvedValue({}) },
      };
      await cb(tx);
    });

    const prisma = {
      organizationInvite: {
        findFirst: findFirstInvite,
        delete: vi.fn(),
      },
      profile: {
        findFirst: findFirstProfileInOrg,
      },
      $transaction: transactionFn,
    } as unknown as PrismaClient;

    const useCase = new CompleteAuthUseCase(prisma);
    const result = await useCase.execute({ userId, email });

    expect(result.next).toBe("/dashboard");
    expect(result.locale).toBeDefined();
    expect(findFirstProfileInOrg).toHaveBeenCalledWith({
      where: { userId, organizationId: orgId },
    });
    expect(transactionFn).toHaveBeenCalledTimes(1);
    const txArg = transactionFn.mock.calls[0]?.[0];
    expect(typeof txArg).toBe("function");
  });

  it("deletes invite and returns /dashboard when invite exists but user already in org", async () => {
    const invite = {
      id: "invite-id",
      organizationId: orgId,
      email,
      role: "MEMBER" as const,
      expiresAt: new Date(Date.now() + 86400000),
    };

    const findFirstInvite = vi.fn().mockResolvedValue(invite);
    const findFirstProfileInOrg = vi.fn().mockResolvedValue({
      id: "existing-profile",
      userId,
      organizationId: orgId,
      role: "MEMBER",
    });
    const deleteInvite = vi.fn().mockResolvedValue(invite);

    const prisma = {
      organizationInvite: {
        findFirst: findFirstInvite,
        delete: deleteInvite,
      },
      profile: { findFirst: findFirstProfileInOrg },
      $transaction: vi.fn(),
    } as unknown as PrismaClient;

    const useCase = new CompleteAuthUseCase(prisma);
    const result = await useCase.execute({ userId, email });

    expect(result.next).toBe("/dashboard");
    expect(result.locale).toBeDefined();
    expect(deleteInvite).toHaveBeenCalledWith({ where: { id: invite.id } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
