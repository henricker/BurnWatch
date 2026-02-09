import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { EncryptionService } from "@/lib/security/encryption";

import { CreateAccountUseCase } from "./index";
import { CloudCredentialsValidationError } from "../../../domain/cloudCredentials";

const VALID_AWS_ID = "AKIA1B2C3D4E5F6G7H89";
const VALID_AWS_SECRET = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789ABCD";

function createEncryptionMock(): EncryptionService {
  return {
    encrypt: vi.fn().mockImplementation((plain: string) => `encrypted:${plain}`),
  } as unknown as EncryptionService;
}

describe("CreateAccountUseCase", () => {
  it("throws CloudCredentialsValidationError when provider is not supported", async () => {
    const prisma = { cloudAccount: { create: vi.fn() } } as unknown as PrismaClient;
    const encryption = createEncryptionMock();

    const useCase = new CreateAccountUseCase(prisma, encryption);
    await expect(
      useCase.execute({
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

    const useCase = new CreateAccountUseCase(prisma, encryption);
    await expect(
      useCase.execute({
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

    const useCase = new CreateAccountUseCase(prisma, encryption);
    await expect(
      useCase.execute({
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
    const createMock = vi.fn().mockResolvedValue({
      id: "new-acc-id",
      provider: "AWS",
      label: "My AWS",
      status: "SYNCED",
      lastSyncError: null,
      lastSyncedAt: null,
      createdAt: created,
      updatedAt: updated,
    });

    const prisma = {
      cloudAccount: { create: createMock },
    } as unknown as PrismaClient;
    const encryption = createEncryptionMock();

    const useCase = new CreateAccountUseCase(prisma, encryption);
    const result = await useCase.execute({
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
    expect(callData.lastSyncedAt).toBeUndefined();

    expect(result.id).toBe("new-acc-id");
    expect(result.provider).toBe("AWS");
    expect(result.label).toBe("My AWS");
    expect(result.status).toBe("SYNCED");
  });
});
