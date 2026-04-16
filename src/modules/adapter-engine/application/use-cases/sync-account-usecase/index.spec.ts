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

function createPrismaTransactionMock(params?: {
  txQueryRaw?: ReturnType<typeof vi.fn>;
  txCloudAccountFindFirst?: ReturnType<typeof vi.fn>;
  txCloudAccountUpdateMany?: ReturnType<typeof vi.fn>;
}) {
  const txQueryRaw = params?.txQueryRaw ?? vi.fn().mockResolvedValue([]);
  const txCloudAccountFindFirst = params?.txCloudAccountFindFirst ?? vi.fn();
  const txCloudAccountUpdateMany =
    params?.txCloudAccountUpdateMany ?? vi.fn().mockResolvedValue({ count: 1 });

  const transactionMock = vi.fn().mockImplementation((arg: unknown) => {
    if (typeof arg === "function") {
      return (arg as (tx: unknown) => Promise<unknown>)({
        $queryRaw: txQueryRaw,
        cloudAccount: {
          findFirst: txCloudAccountFindFirst,
          updateMany: txCloudAccountUpdateMany,
        },
      });
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg as Array<unknown>);
    }
    return Promise.reject(new Error("Unsupported $transaction payload"));
  });

  return {
    transactionMock,
    txQueryRaw,
    txCloudAccountFindFirst,
    txCloudAccountUpdateMany,
  };
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

    const txCloudAccountFindFirst = vi
      .fn()
      .mockResolvedValueOnce(null) // no existing SYNCING account for provider
      .mockResolvedValueOnce(null); // no lastSyncedAt for provider
    const { transactionMock, txCloudAccountUpdateMany } = createPrismaTransactionMock({
      txCloudAccountFindFirst,
      txCloudAccountUpdateMany: vi.fn().mockResolvedValue({ count: 1 }),
    });

    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue(account),
        update: updateMock,
      },
      dailySpend: { upsert: vi.fn().mockResolvedValue({}) },
      $transaction: transactionMock,
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
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ status: "SYNCED", lastSyncError: null });
    expect(txCloudAccountUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "acc-1",
        organizationId: "org-1",
        status: { not: "SYNCING" },
      },
      data: { status: "SYNCING", lastSyncError: null },
    });
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
    const txCloudAccountFindFirst = vi
      .fn()
      .mockResolvedValueOnce(null) // no current SYNCING account
      .mockResolvedValueOnce({ lastSyncedAt: oneHourAgo }); // provider was synced recently
    const txCloudAccountUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const { transactionMock, txCloudAccountUpdateMany: updateManyMock } =
      createPrismaTransactionMock({
        txCloudAccountFindFirst,
        txCloudAccountUpdateMany,
      });

    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue(account),
        update: vi.fn(),
      },
      $transaction: transactionMock,
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
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("throws SyncRateLimitError when plan is STARTER and provider already has a SYNCING account", async () => {
    const account = {
      id: "acc-1",
      organizationId: "org-1",
      provider: "AWS",
      encryptedCredentials: "enc",
      lastSyncedAt: null as Date | null,
      organization: { subscription: { plan: "STARTER" } },
    };
    const txCloudAccountFindFirst = vi
      .fn()
      .mockResolvedValueOnce({ id: "acc-2" }); // another provider account is currently SYNCING
    const txCloudAccountUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const { transactionMock, txCloudAccountUpdateMany: updateManyMock, txQueryRaw } =
      createPrismaTransactionMock({
        txCloudAccountFindFirst,
        txCloudAccountUpdateMany,
      });

    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue(account),
        update: vi.fn(),
      },
      $transaction: transactionMock,
    } as unknown as PrismaClient;
    const encryption = createEncryptionMock();

    const useCase = new SyncAccountUseCase(prisma, encryption);

    await expect(
      useCase.execute({
        organizationId: "org-1",
        accountId: "acc-1",
      }),
    ).rejects.toThrow(SyncRateLimitError);

    expect(txQueryRaw).toHaveBeenCalledTimes(1);
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(prisma.cloudAccount.update).not.toHaveBeenCalled();
  });

  it("allows only one concurrent STARTER sync for the same provider", async () => {
    const accounts = {
      "acc-1": {
        id: "acc-1",
        organizationId: "org-1",
        provider: "AWS",
        encryptedCredentials: "enc-1",
        lastSyncedAt: null as Date | null,
        organization: { subscription: { plan: "STARTER" } },
      },
      "acc-2": {
        id: "acc-2",
        organizationId: "org-1",
        provider: "AWS",
        encryptedCredentials: "enc-2",
        lastSyncedAt: null as Date | null,
        organization: { subscription: { plan: "STARTER" } },
      },
    };
    const state = {
      syncing: false,
      lastSyncedAt: null as Date | null,
    };

    let providerLock: Promise<void> = Promise.resolve();
    let releaseProviderLock: (() => void) | null = null;

    const transactionMock = vi.fn().mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg as Array<unknown>);
      }
      if (typeof arg !== "function") {
        throw new Error("Unsupported $transaction payload");
      }

      await providerLock;
      providerLock = new Promise<void>((resolve) => {
        releaseProviderLock = resolve;
      });

      const txCloudAccountFindFirst = vi.fn().mockImplementation((args: { where: Record<string, unknown> }) => {
        if (args.where.status === "SYNCING") {
          return Promise.resolve(state.syncing ? { id: "in-flight" } : null);
        }
        return Promise.resolve(state.lastSyncedAt ? { lastSyncedAt: state.lastSyncedAt } : null);
      });
      const txCloudAccountUpdateMany = vi.fn().mockImplementation(() => {
        if (state.syncing) {
          return Promise.resolve({ count: 0 });
        }
        state.syncing = true;
        return Promise.resolve({ count: 1 });
      });

      try {
        return await (arg as (tx: unknown) => Promise<unknown>)({
          $queryRaw: vi.fn().mockResolvedValue([]),
          cloudAccount: {
            findFirst: txCloudAccountFindFirst,
            updateMany: txCloudAccountUpdateMany,
          },
        });
      } finally {
        releaseProviderLock?.();
        releaseProviderLock = null;
      }
    });

    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockImplementation((args: { where: { id: string } }) => {
          return Promise.resolve(accounts[args.where.id as "acc-1" | "acc-2"] ?? null);
        }),
        update: vi.fn().mockImplementation((args: { data: { status: string; lastSyncedAt?: Date } }) => {
          if (args.data.status === "SYNCED") {
            state.syncing = false;
            state.lastSyncedAt = args.data.lastSyncedAt ?? state.lastSyncedAt;
          }
          if (args.data.status === "SYNC_ERROR") {
            state.syncing = false;
          }
          return Promise.resolve(args.data);
        }),
      },
      dailySpend: { upsert: vi.fn().mockResolvedValue({}) },
      $transaction: transactionMock,
    } as unknown as PrismaClient;
    const encryption = createEncryptionMock();
    const useCase = new SyncAccountUseCase(prisma, encryption);

    const first = useCase.execute({
      organizationId: "org-1",
      accountId: "acc-1",
    });
    const second = useCase.execute({
      organizationId: "org-1",
      accountId: "acc-2",
    });
    const results = await Promise.allSettled([first, second]);
    const fulfilled = results.filter(
      (result): result is PromiseFulfilledResult<unknown> => result.status === "fulfilled",
    );
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(SyncRateLimitError);
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
    const txCloudAccountFindFirst = vi.fn().mockResolvedValue({ lastSyncedAt: twoMinutesAgo });
    const txCloudAccountUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const { transactionMock, txCloudAccountUpdateMany: updateManyMock, txQueryRaw } =
      createPrismaTransactionMock({
        txCloudAccountFindFirst,
        txCloudAccountUpdateMany,
      });

    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue(account),
        update: vi.fn(),
      },
      $transaction: transactionMock,
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
    expect(txQueryRaw).not.toHaveBeenCalled();
    expect(updateManyMock).not.toHaveBeenCalled();
  });
});
