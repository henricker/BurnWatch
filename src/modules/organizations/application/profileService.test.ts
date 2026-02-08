import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  getProfileByUserId,
  getProfileByUserAndOrganization,
  updateProfile,
  ProfileNotFoundError,
} from "./profileService";

describe("getProfileByUserId", () => {
  it("returns null when no profile exists", async () => {
    const prisma = {
      profile: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;

    const result = await getProfileByUserId(prisma, "user-1");
    expect(result).toBeNull();
    expect(prisma.profile.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { id: true, organizationId: true, role: true, locale: true },
    });
  });

  it("returns profile summary when profile exists", async () => {
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          id: "profile-1",
          organizationId: "org-1",
          role: "OWNER",
          locale: "en",
        }),
      },
    } as unknown as PrismaClient;

    const result = await getProfileByUserId(prisma, "user-1");
    expect(result).toEqual({
      id: "profile-1",
      organizationId: "org-1",
      role: "OWNER",
      locale: "en",
    });
  });
});

describe("getProfileByUserAndOrganization", () => {
  it("returns null when user is not in organization", async () => {
    const prisma = {
      profile: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;

    const result = await getProfileByUserAndOrganization(
      prisma,
      "user-1",
      "org-1",
    );
    expect(result).toBeNull();
    expect(prisma.profile.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", organizationId: "org-1" },
      select: expect.objectContaining({
        id: true,
        organizationId: true,
        role: true,
        firstName: true,
        lastName: true,
        avatarPath: true,
        theme: true,
        locale: true,
      }),
    });
  });

  it("returns profile when user belongs to organization", async () => {
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          id: "profile-1",
          organizationId: "org-1",
          role: "MEMBER",
          firstName: "Jane",
          lastName: "Doe",
          avatarPath: "/av.png",
          theme: "dark",
          locale: "pt",
        }),
      },
    } as unknown as PrismaClient;

    const result = await getProfileByUserAndOrganization(
      prisma,
      "user-1",
      "org-1",
    );
    expect(result).toEqual({
      id: "profile-1",
      organizationId: "org-1",
      role: "MEMBER",
      firstName: "Jane",
      lastName: "Doe",
      avatarPath: "/av.png",
      theme: "dark",
      locale: "pt",
    });
  });
});

describe("updateProfile", () => {
  it("throws ProfileNotFoundError when profile does not exist", async () => {
    const prisma = {
      profile: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    } as unknown as PrismaClient;

    await expect(
      updateProfile(prisma, "user-1", "org-1", { firstName: "John" }),
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

    const result = await updateProfile(prisma, "user-1", "org-1", {
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

    await updateProfile(prisma, "user-1", "org-1", {
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
