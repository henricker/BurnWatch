import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { DeleteAccountUseCase } from "./index";
import { CloudCredentialsNotFoundError } from "../../../domain/cloudCredentials";

describe("DeleteAccountUseCase", () => {
  it("throws CloudCredentialsNotFoundError when account does not exist or wrong org", async () => {
    const prisma = {
      cloudAccount: {
        findFirst: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      },
    } as unknown as PrismaClient;

    const useCase = new DeleteAccountUseCase(prisma);
    await expect(
      useCase.execute("org-1", "acc-1"),
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

    const useCase = new DeleteAccountUseCase(prisma);
    await useCase.execute("org-1", "acc-1");

    expect(deleteMock).toHaveBeenCalledWith({
      where: { id: "acc-1" },
    });
  });
});
