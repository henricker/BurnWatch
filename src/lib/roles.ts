import type { Role } from "@prisma/client";

/**
 * Role hierarchy and permissions.
 * OWNER: full control, cannot be removed, only one can delete the organization.
 * ADMIN: manage invites and members (cannot remove OWNER, cannot invite ADMIN).
 * MEMBER: read-only (billing, alerts).
 */
export type { Role };

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export function canManageMembers(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canInviteAdmin(role: Role): boolean {
  return role === "OWNER";
}

export function canRemoveMember(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Only OWNER can remove the organization. */
export function canDeleteOrganization(role: Role): boolean {
  return role === "OWNER";
}

/** OWNER cannot be removed by anyone. */
export function isProtectedRole(role: Role): boolean {
  return role === "OWNER";
}
