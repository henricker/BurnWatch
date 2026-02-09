import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { UpdateProfileUseCase } from "./index";
import { ProfileNotFoundError } from "../../../domain/profile";

describe("UpdateProfileUseCase", () => {
  it("throws ProfileNotFoundError when profile does not exist", async () => {
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    } as unknown as PrismaClient;

    await expect(
      (new UpdateProfileUseCase(prisma)).execute("user-1", "org-1", { firstName: "John" }),
    ).rejects.toThrow(ProfileNotFoundError);
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it("updates allowed fields and returns result", async () => {
    const updateMock = vi.fn().mockResolvedValue({
      id: "profile-1",
      firstName: "John",
      lastName: "Doe",
      avatarPath: null,
      theme: "dark",
      locale: "en",
    });
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          id: "profile-1",
          userId: "user-1",
          organizationId: "org-1",
        }),
        update: updateMock,
      },
    } as unknown as PrismaClient;

    const useCase = new UpdateProfileUseCase(prisma);
    const result = await useCase.execute("user-1", "org-1", {
      firstName: "John",
      lastName: "Doe",
      theme: "dark",
      locale: "en",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "profile-1" },
      data: {
        firstName: "John",
        lastName: "Doe",
        theme: "dark",
        locale: "en",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarPath: true,
        theme: true,
        locale: true,
      },
    });
    expect(result).toEqual({
      id: "profile-1",
      firstName: "John",
      lastName: "Doe",
      avatarPath: null,
      theme: "dark",
      locale: "en",
    });
  });

  it("normalizes invalid theme to system and invalid locale to pt", async () => {
    const updateMock = vi.fn().mockResolvedValue({
      id: "profile-1",
      firstName: null,
      lastName: null,
      avatarPath: null,
      theme: "system",
      locale: "pt",
    });
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue({ id: "profile-1" }),
        update: updateMock,
      },
    } as unknown as PrismaClient;

    const useCase = new UpdateProfileUseCase(prisma);
    await useCase.execute("user-1", "org-1", {
      theme: "invalid",
      locale: "xx",
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ theme: "system", locale: "pt" }),
      }),
    );
  });
});
