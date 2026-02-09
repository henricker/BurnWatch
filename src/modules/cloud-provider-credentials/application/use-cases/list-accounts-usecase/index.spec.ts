import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { ListAccountsUseCase } from "./index";

describe("ListAccountsUseCase", () => {
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

    const useCase = new ListAccountsUseCase(prisma);
    const result = await useCase.execute("org-1");

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

    const useCase = new ListAccountsUseCase(prisma);
    const result = await useCase.execute("org-2");
    expect(result).toEqual([]);
  });
});
