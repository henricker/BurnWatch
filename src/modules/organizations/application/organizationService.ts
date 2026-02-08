import type { PrismaClient } from "@prisma/client";

import { canDeleteOrganization, canUpdateOrganizationName } from "@/lib/roles";

// ---------------------------------------------------------------------------
// Types for optional Supabase Admin (avoid importing Supabase in service)
// ---------------------------------------------------------------------------

export interface SupabaseAdminAuth {
  deleteUser(userId: string): Promise<{ error: unknown }>;
}

export interface SupabaseAdminLike {
  auth: { admin: SupabaseAdminAuth };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class OrganizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationError";
  }
}

export class OrganizationNotFoundError extends OrganizationError {
  constructor(message: string = "Profile not found") {
    super(message);
    this.name = "OrganizationNotFoundError";
  }
}

export class OrganizationForbiddenError extends OrganizationError {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationForbiddenError";
  }
}

// ---------------------------------------------------------------------------
// updateOrganizationName
// ---------------------------------------------------------------------------

/**
 * Updates the organization name. Caller must be OWNER or ADMIN in the org.
 */
export async function updateOrganizationName(
  prisma: PrismaClient,
  userId: string,
  name: string,
): Promise<void> {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    throw new OrganizationError("name is required and must be non-empty");
  }

  const profile = await prisma.profile.findFirst({
    where: { userId },
    include: { organization: true },
  });

  if (!profile) {
    throw new OrganizationNotFoundError();
  }

  if (!canUpdateOrganizationName(profile.role)) {
    throw new OrganizationForbiddenError(
      "Only Owner or Admin can update organization name",
    );
  }

  await prisma.organization.update({
    where: { id: profile.organizationId },
    data: { name: trimmed },
  });
}

// ---------------------------------------------------------------------------
// deleteOrganization
// ---------------------------------------------------------------------------

/**
 * Deletes the organization and all related data (cascade). Only OWNER.
 * Optionally deletes all members' Supabase Auth users when supabaseAdmin is provided.
 */
export async function deleteOrganization(
  prisma: PrismaClient,
  userId: string,
  options?: { supabaseAdmin?: SupabaseAdminLike | null },
): Promise<void> {
  const profile = await prisma.profile.findFirst({
    where: { userId },
    include: { organization: true },
  });

  if (!profile) {
    throw new OrganizationNotFoundError();
  }

  if (!canDeleteOrganization(profile.role)) {
    throw new OrganizationForbiddenError(
      "Only the organization owner can delete it",
    );
  }

  const organizationId = profile.organizationId;

  const members = await prisma.profile.findMany({
    where: { organizationId },
    select: { userId: true },
  });

  const admin = options?.supabaseAdmin ?? null;
  if (admin) {
    for (const { userId: memberUserId } of members) {
      await admin.auth.admin.deleteUser(memberUserId).catch((err) => {
        if (process.env.NODE_ENV !== "test") {
          console.error("[OrganizationService] deleteUser failed:", memberUserId, err);
        }
      });
    }
  }

  await prisma.organization.delete({
    where: { id: organizationId },
  });
}
