import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { EncryptionService } from "@/lib/security/encryption";

vi.mock("../../../infrastructure/providers/awsProvider", () => {
  class AwsProviderMock {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- mock impl
    async fetchDailySpend(_cloudAccount: unknown, _range: unknown) {
      return [];
    }
  }
  return { AwsProvider: AwsProviderMock };
});

import { SyncAccountUseCase, SyncNotFoundError, SyncRateLimitError } from "./index";

function createEncryptionMock(): EncryptionService {
  return { decrypt: vi.fn(), encrypt: vi.fn() } as unknown as EncryptionService;
}

describe("SyncAccountUseCase", () => {
  it("throws SyncNotFoundError when account does not exist", async () => {
    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    } as unknown as PrismaClient;
    const encryption = createEncryptionMock();

    const useCase = new SyncAccountUseCase(prisma, encryption);

    await expect(
      useCase.execute({
        organizationId: "org-1",
        accountId: "acc-1",
      }),
    ).rejects.toThrow(SyncNotFoundError);

    expect(prisma.cloudAccount.update).not.toHaveBeenCalled();
  });

  it("sets SYNCING then SYNCED and returns result for AWS (MockProvider)", async () => {
    const account = {
      id: "acc-1",
      organizationId: "org-1",
      provider: "AWS",
      encryptedCredentials: "enc",
      lastSyncedAt: null as Date | null,
      organization: { subscription: null as { plan: string } | null },
    };
    const updates: unknown[] = [];
    const updateMock = vi.fn().mockImplementation((args: { where: { id: string }; data: unknown }) => {
      updates.push(args.data);
      if (args.data && typeof args.data === "object" && "status" in args.data && args.data.status === "SYNCING") {
        return Promise.resolve({});
      }
      return Promise.resolve({
        lastSyncedAt: new Date("2025-01-10T12:00:00Z"),
        status: "SYNCED",
        lastSyncError: null,
      });
    });

    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValueOnce(account).mockResolvedValueOnce(null),
        update: updateMock,
      },
      dailySpend: { upsert: vi.fn().mockResolvedValue({}) },
      $transaction: vi.fn().mockImplementation((fns: unknown[]) => Promise.all((fns as Array<() => Promise<unknown>>).map((fn) => fn()))),
    } as unknown as PrismaClient;
    const encryption = createEncryptionMock();

    const useCase = new SyncAccountUseCase(prisma, encryption);
    const result = await useCase.execute({
      organizationId: "org-1",
      accountId: "acc-1",
    });

    expect(result.status).toBe("SYNCED");
    expect(result.lastSyncError).toBeNull();
    expect(result.rowsUpserted).toBe(0);
    expect(updates).toHaveLength(2);
    expect(updates[0]).toMatchObject({ status: "SYNCING", lastSyncError: null });
    expect(updates[1]).toMatchObject({ status: "SYNCED", lastSyncError: null });
  });

  it("throws SyncRateLimitError when plan is STARTER and same provider was synced within 24h", async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const account = {
      id: "acc-1",
      organizationId: "org-1",
      provider: "AWS",
      encryptedCredentials: "enc",
      lastSyncedAt: null as Date | null,
      organization: { subscription: { plan: "STARTER" } },
    };
    const prisma = {
      cloudAccount: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(account)
          .mockResolvedValueOnce({ lastSyncedAt: oneHourAgo }),
        update: vi.fn(),
      },
    } as unknown as PrismaClient;
    const encryption = createEncryptionMock();

    const useCase = new SyncAccountUseCase(prisma, encryption);

    await expect(
      useCase.execute({
        organizationId: "org-1",
        accountId: "acc-1",
      }),
    ).rejects.toThrow(SyncRateLimitError);

    expect(prisma.cloudAccount.update).not.toHaveBeenCalled();
  });

  it("throws SyncRateLimitError when plan is PRO and same account was synced within 5min", async () => {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    const account = {
      id: "acc-1",
      organizationId: "org-1",
      provider: "AWS",
      encryptedCredentials: "enc",
      lastSyncedAt: twoMinutesAgo,
      organization: { subscription: { plan: "PRO" } },
    };
    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue(account),
        update: vi.fn(),
      },
    } as unknown as PrismaClient;
    const encryption = createEncryptionMock();

    const useCase = new SyncAccountUseCase(prisma, encryption);

    await expect(
      useCase.execute({
        organizationId: "org-1",
        accountId: "acc-1",
      }),
    ).rejects.toThrow(SyncRateLimitError);

    expect(prisma.cloudAccount.update).not.toHaveBeenCalled();
  });
});
