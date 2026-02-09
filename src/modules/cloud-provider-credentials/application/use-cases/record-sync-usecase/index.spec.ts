import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { RecordSyncUseCase } from "./index";
import { CloudCredentialsNotFoundError } from "../../../domain/cloudCredentials";

describe("RecordSyncUseCase", () => {
  it("throws CloudCredentialsNotFoundError when account does not exist or wrong org", async () => {
    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    } as unknown as PrismaClient;

    const useCase = new RecordSyncUseCase(prisma);
    await expect(
      useCase.execute("org-1", "acc-1"),
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

    const useCase = new RecordSyncUseCase(prisma);
    const result = await useCase.execute("org-1", "acc-1");

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
