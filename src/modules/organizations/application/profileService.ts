import type { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileError";
  }
}

export class ProfileNotFoundError extends ProfileError {
  constructor(message: string = "Profile not found") {
    super(message);
    this.name = "ProfileNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// getProfileByUserId
// ---------------------------------------------------------------------------

export interface ProfileByUserIdResult {
  id: string;
  organizationId: string;
  role: string;
  locale: string | null;
}

/**
 * Returns the first profile for the user (one user can have one org in our flow).
 * Use this to get organizationId for the current user.
 */
export async function getProfileByUserId(
  prisma: PrismaClient,
  userId: string,
): Promise<ProfileByUserIdResult | null> {
  const profile = await prisma.profile.findFirst({
    where: { userId },
    select: { id: true, organizationId: true, role: true, locale: true },
  });
  if (!profile) return null;
  return {
    id: profile.id,
    organizationId: profile.organizationId,
    role: profile.role,
    locale: profile.locale ?? null,
  };
}

// ---------------------------------------------------------------------------
// getProfileByUserAndOrganization
// ---------------------------------------------------------------------------

export interface ProfileByUserAndOrgResult {
  id: string;
  organizationId: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  avatarPath: string | null;
  theme: string | null;
  locale: string | null;
}

/**
 * Returns the profile when the user belongs to the given organization.
 */
export async function getProfileByUserAndOrganization(
  prisma: PrismaClient,
  userId: string,
  organizationId: string,
): Promise<ProfileByUserAndOrgResult | null> {
  const profile = await prisma.profile.findFirst({
    where: { userId, organizationId },
    select: {
      id: true,
      organizationId: true,
      role: true,
      firstName: true,
      lastName: true,
      avatarPath: true,
      theme: true,
      locale: true,
    },
  });
  if (!profile) return null;
  return {
    id: profile.id,
    organizationId: profile.organizationId,
    role: profile.role,
    firstName: profile.firstName ?? null,
    lastName: profile.lastName ?? null,
    avatarPath: profile.avatarPath ?? null,
    theme: profile.theme ?? null,
    locale: profile.locale ?? null,
  };
}

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------

const VALID_THEMES = ["light", "dark", "system"] as const;
const VALID_LOCALES = ["pt", "en", "es"] as const;

export interface UpdateProfileParams {
  firstName?: string | null;
  lastName?: string | null;
  avatarPath?: string | null;
  theme?: string | null;
  locale?: string | null;
}

export interface UpdateProfileResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarPath: string | null;
  theme: string | null;
  locale: string | null;
}

/**
 * Updates the profile for the user in the given organization.
 * Validates theme and locale; returns updated fields including locale (for cookie).
 */
export async function updateProfile(
  prisma: PrismaClient,
  userId: string,
  organizationId: string,
  params: UpdateProfileParams,
): Promise<UpdateProfileResult> {
  const profile = await prisma.profile.findFirst({
    where: { userId, organizationId },
  });

  if (!profile) {
    throw new ProfileNotFoundError("Profile not found for this organization");
  }

  const updateData: {
    firstName?: string | null;
    lastName?: string | null;
    avatarPath?: string | null;
    theme?: string | null;
    locale?: string | null;
  } = {};

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

  const updated = await prisma.profile.update({
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
