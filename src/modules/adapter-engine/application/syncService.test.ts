import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { EncryptionService } from "@/lib/security/encryption";

// Mock AwsProvider so sync tests don't hit the real AWS SDK / network.
vi.mock("../infrastructure/providers/awsProvider", () => {
  class AwsProviderMock {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async fetchDailySpend(_cloudAccount: unknown, _range: unknown) {
      return [];
    }
  }
  return { AwsProvider: AwsProviderMock };
});

import { syncAccount, SyncNotFoundError } from "./syncService";

function createEncryptionMock(): EncryptionService {
  return { decrypt: vi.fn(), encrypt: vi.fn() } as unknown as EncryptionService;
}

describe("syncAccount", () => {
  it("throws SyncNotFoundError when account does not exist", async () => {
    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    } as unknown as PrismaClient;
    const encryption = createEncryptionMock();

    await expect(
      syncAccount(prisma, encryption, {
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
        findFirst: vi.fn().mockResolvedValue(account),
        update: updateMock,
      },
      dailySpend: { upsert: vi.fn().mockResolvedValue({}) },
    } as unknown as PrismaClient;
    const encryption = createEncryptionMock();

    const result = await syncAccount(prisma, encryption, {
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
});
