import type { PrismaClient } from "@prisma/client";

import type { UpdateProfileParams, UpdateProfileResult } from "../../../domain/profile";
import { ProfileNotFoundError } from "../../../domain/profile";

const VALID_THEMES = ["light", "dark", "system"] as const;
const VALID_LOCALES = ["pt", "en", "es"] as const;

export class UpdateProfileUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(
    userId: string,
    organizationId: string,
    params: UpdateProfileParams,
  ): Promise<UpdateProfileResult> {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, organizationId },
    });

    if (!profile) {
      throw new ProfileNotFoundError("Profile not found for this organization");
    }

    const updateData: Record<string, string | null | undefined> = {};

    if (params.firstName !== undefined) {
      updateData.firstName =
        params.firstName === "" ? null : (params.firstName ?? "").trim() || null;
    }
    if (params.lastName !== undefined) {
      updateData.lastName =
        params.lastName === "" ? null : (params.lastName ?? "").trim() || null;
    }
    if (params.avatarPath !== undefined) {
      updateData.avatarPath =
        params.avatarPath === "" ? null : params.avatarPath || null;
    }
    if (params.theme !== undefined) {
      updateData.theme =
        params.theme && VALID_THEMES.includes(params.theme as (typeof VALID_THEMES)[number])
          ? params.theme
          : "system";
    }
    if (params.locale !== undefined) {
      updateData.locale =
        params.locale && VALID_LOCALES.includes(params.locale as (typeof VALID_LOCALES)[number])
          ? params.locale
          : "pt";
    }

    const updated = await this.prisma.profile.update({
      where: { id: profile.id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarPath: true,
        theme: true,
        locale: true,
      },
    });

    return {
      id: updated.id,
      firstName: updated.firstName ?? null,
      lastName: updated.lastName ?? null,
      avatarPath: updated.avatarPath ?? null,
      theme: updated.theme ?? null,
      locale: updated.locale ?? null,
    };
  }
}
