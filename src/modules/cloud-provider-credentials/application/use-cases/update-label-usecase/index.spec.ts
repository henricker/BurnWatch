import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { UpdateLabelUseCase } from "./index";
import { CloudCredentialsNotFoundError } from "../../../domain/cloudCredentials";
import { CloudCredentialsValidationError } from "../../../domain/cloudCredentials";

describe("UpdateLabelUseCase", () => {
  it("throws CloudCredentialsValidationError when label is empty", async () => {
    const prisma = {
      cloudAccount: { findFirst: vi.fn(), update: vi.fn() },
    } as unknown as PrismaClient;

    const useCase = new UpdateLabelUseCase(prisma);
    await expect(
      useCase.execute("org-1", "acc-1", "  "),
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

    const useCase = new UpdateLabelUseCase(prisma);
    await expect(
      useCase.execute("org-1", "acc-1", "New Label"),
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

    const useCase = new UpdateLabelUseCase(prisma);
    await useCase.execute("org-1", "acc-1", "New Label");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { label: "New Label" },
    });
  });
});
