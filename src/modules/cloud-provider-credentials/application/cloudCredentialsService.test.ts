import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { EncryptionService } from "@/lib/security/encryption";

import {
  createAccount,
  deleteAccount,
  listAccounts,
  syncAccount,
  updateLabel,
  CloudCredentialsNotFoundError,
  CloudCredentialsValidationError,
} from "./cloudCredentialsService";

const VALID_AWS_ID = "AKIA1B2C3D4E5F6G7H89";
const VALID_AWS_SECRET = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789ABCD";

function createEncryptionMock(): EncryptionService {
  return {
    encrypt: vi.fn().mockImplementation((plain: string) => `encrypted:${plain}`),
  } as unknown as EncryptionService;
}

describe("listAccounts", () => {
  it("returns DTOs for accounts in the organization", async () => {
    const created = new Date("2025-01-01T12:00:00Z");
    const updated = new Date("2025-01-02T12:00:00Z");
    const lastSynced = new Date("2025-01-03T12:00:00Z");
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "acc-1",
        provider: "AWS",
        label: "My AWS",
        status: "SYNCED",
        lastSyncError: null,
        lastSyncedAt: lastSynced,
        createdAt: created,
        updatedAt: updated,
      },
    ]);

    const prisma = {
      cloudAccount: { findMany },
    } as unknown as PrismaClient;

    const result = await listAccounts(prisma, "org-1");

    expect(findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        provider: true,
        label: true,
        status: true,
        lastSyncError: true,
        lastSyncedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "acc-1",
      provider: "AWS",
      label: "My AWS",
      status: "SYNCED",
      lastSyncError: null,
      lastSyncedAt: "2025-01-03T12:00:00.000Z",
      createdAt: "2025-01-01T12:00:00.000Z",
      updatedAt: "2025-01-02T12:00:00.000Z",
    });
  });

  it("returns empty array when no accounts", async () => {
    const prisma = {
      cloudAccount: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    const result = await listAccounts(prisma, "org-2");
    expect(result).toEqual([]);
  });
});

describe("createAccount", () => {
  it("throws CloudCredentialsValidationError when provider is not supported", async () => {
    const prisma = { cloudAccount: { create: vi.fn() } } as unknown as PrismaClient;
    const encryption = createEncryptionMock();

    await expect(
      createAccount(prisma, encryption, {
        organizationId: "org-1",
        provider: "OTHER",
        label: "Other",
        payload: {},
      }),
    ).rejects.toThrow(CloudCredentialsValidationError);

    expect(prisma.cloudAccount.create).not.toHaveBeenCalled();
  });

  it("throws CloudCredentialsValidationError when label is empty", async () => {
    const prisma = { cloudAccount: { create: vi.fn() } } as unknown as PrismaClient;
    const encryption = createEncryptionMock();

    await expect(
      createAccount(prisma, encryption, {
        organizationId: "org-1",
        provider: "AWS",
        label: "  ",
        payload: { accessKeyId: VALID_AWS_ID, secretAccessKey: VALID_AWS_SECRET },
      }),
    ).rejects.toThrow(CloudCredentialsValidationError);

    expect(prisma.cloudAccount.create).not.toHaveBeenCalled();
  });

  it("throws CloudCredentialsValidationError when credentials are invalid", async () => {
    const prisma = { cloudAccount: { create: vi.fn() } } as unknown as PrismaClient;
    const encryption = createEncryptionMock();

    await expect(
      createAccount(prisma, encryption, {
        organizationId: "org-1",
        provider: "AWS",
        label: "AWS Account",
        payload: { accessKeyId: "", secretAccessKey: VALID_AWS_SECRET },
      }),
    ).rejects.toThrow(CloudCredentialsValidationError);

    expect(prisma.cloudAccount.create).not.toHaveBeenCalled();
  });

  it("creates account with encrypted credentials and returns DTO", async () => {
    const created = new Date("2025-01-01T12:00:00Z");
    const updated = new Date("2025-01-01T12:00:00Z");
    const lastSynced = new Date("2025-01-01T12:00:00Z");
    const createMock = vi.fn().mockResolvedValue({
      id: "new-acc-id",
      provider: "AWS",
      label: "My AWS",
      status: "SYNCED",
      lastSyncError: null,
      lastSyncedAt: lastSynced,
      createdAt: created,
      updatedAt: updated,
    });

    const prisma = {
      cloudAccount: { create: createMock },
    } as unknown as PrismaClient;
    const encryption = createEncryptionMock();

    const result = await createAccount(prisma, encryption, {
      organizationId: "org-1",
      provider: "AWS",
      label: "My AWS",
      payload: { accessKeyId: VALID_AWS_ID, secretAccessKey: VALID_AWS_SECRET },
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    const callData = createMock.mock.calls[0]?.[0]?.data;
    expect(callData).toMatchObject({
      organizationId: "org-1",
      provider: "AWS",
      label: "My AWS",
    });
    expect(callData.encryptedCredentials).toContain("encrypted:");
    expect(callData.lastSyncedAt).toBeInstanceOf(Date);

    expect(result.id).toBe("new-acc-id");
    expect(result.provider).toBe("AWS");
    expect(result.label).toBe("My AWS");
    expect(result.status).toBe("SYNCED");
  });
});

describe("updateLabel", () => {
  it("throws CloudCredentialsValidationError when label is empty", async () => {
    const prisma = {
      cloudAccount: { findFirst: vi.fn(), update: vi.fn() },
    } as unknown as PrismaClient;

    await expect(
      updateLabel(prisma, "org-1", "acc-1", "  "),
    ).rejects.toThrow(CloudCredentialsValidationError);

    expect(prisma.cloudAccount.findFirst).not.toHaveBeenCalled();
  });

  it("throws CloudCredentialsNotFoundError when account does not exist or wrong org", async () => {
    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    } as unknown as PrismaClient;

    await expect(
      updateLabel(prisma, "org-1", "acc-1", "New Label"),
    ).rejects.toThrow(CloudCredentialsNotFoundError);

    expect(prisma.cloudAccount.update).not.toHaveBeenCalled();
  });

  it("updates label when account exists in organization", async () => {
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue({ id: "acc-1", organizationId: "org-1" }),
        update: updateMock,
      },
    } as unknown as PrismaClient;

    await updateLabel(prisma, "org-1", "acc-1", "New Label");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { label: "New Label" },
    });
  });
});

describe("syncAccount", () => {
  it("throws CloudCredentialsNotFoundError when account does not exist or wrong org", async () => {
    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    } as unknown as PrismaClient;

    await expect(
      syncAccount(prisma, "org-1", "acc-1"),
    ).rejects.toThrow(CloudCredentialsNotFoundError);
  });

  it("updates lastSyncedAt and status and returns SyncResultDto", async () => {
    const lastSynced = new Date("2025-01-05T12:00:00Z");
    const updateMock = vi.fn().mockResolvedValue({
      lastSyncedAt: lastSynced,
      status: "SYNCED",
      lastSyncError: null,
    });

    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue({ id: "acc-1", organizationId: "org-1" }),
        update: updateMock,
      },
    } as unknown as PrismaClient;

    const result = await syncAccount(prisma, "org-1", "acc-1");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: {
        lastSyncedAt: expect.any(Date),
        status: "SYNCED",
        lastSyncError: null,
      },
      select: { lastSyncedAt: true, status: true, lastSyncError: true },
    });
    expect(result).toEqual({
      lastSyncedAt: "2025-01-05T12:00:00.000Z",
      status: "SYNCED",
      lastSyncError: null,
    });
  });
});

describe("deleteAccount", () => {
  it("throws CloudCredentialsNotFoundError when account does not exist or wrong org", async () => {
    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      },
    } as unknown as PrismaClient;

    await expect(
      deleteAccount(prisma, "org-1", "acc-1"),
    ).rejects.toThrow(CloudCredentialsNotFoundError);

    expect(prisma.cloudAccount.delete).not.toHaveBeenCalled();
  });

  it("deletes account when it exists in organization", async () => {
    const deleteMock = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue({ id: "acc-1", organizationId: "org-1" }),
        delete: deleteMock,
      },
    } as unknown as PrismaClient;

    await deleteAccount(prisma, "org-1", "acc-1");

    expect(deleteMock).toHaveBeenCalledWith({
      where: { id: "acc-1" },
    });
  });
});
