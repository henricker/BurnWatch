import type { PrismaClient } from "@prisma/client";
import type { Role } from "@prisma/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Custom errors (strict typing, no 'any')
// ---------------------------------------------------------------------------

export class InviteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InviteError";
  }
}

export class InviteForbiddenError extends InviteError {
  constructor(message: string) {
    super(message);
    this.name = "InviteForbiddenError";
  }
}

export class InviteValidationError extends InviteError {
  constructor(message: string) {
    super(message);
    this.name = "InviteValidationError";
  }
}

// ---------------------------------------------------------------------------
// createInvite
// ---------------------------------------------------------------------------

export interface CreateInviteParams {
  /** Supabase auth user id of the requester (OWNER or ADMIN). */
  adminId: string;
  organizationId: string;
  guestEmail: string;
  /** Role to assign when the guest accepts the invite. */
  targetRole: Role;
  /** Where to redirect the guest after clicking the magic link (e.g. origin + "/auth/callback"). */
  emailRedirectTo?: string;
}

/**
 * Creates an organization invite and sends a magic link to the guest.
 *
 * Hierarchy:
 * - Only OWNER can invite ADMIN (keeps account sovereignty).
 * - ADMIN can only invite MEMBER.
 * - OWNER can invite ADMIN or MEMBER.
 *
 * Duplicate check: we do not invite if the guest already has a profile in this
 * organization. That check is enforced at accept time in authCompletionService
 * (when we have the guest's userId after sign-in).
 */
export async function createInvite(
  prisma: PrismaClient,
  supabase: SupabaseClient,
  params: CreateInviteParams,
): Promise<{ id: string; email: string; role: Role; expiresAt: Date }> {
  const { adminId, organizationId, guestEmail, targetRole, emailRedirectTo } = params;

  try {
    // 1) Load requester's profile in this organization.
    const requesterProfile = await prisma.profile.findFirst({
      where: {
        userId: adminId,
        organizationId,
      },
    });

    if (!requesterProfile) {
      throw new InviteForbiddenError("Requester does not belong to this organization.");
    }

    const requesterRole = requesterProfile.role;

    // 2) Requester must be OWNER or ADMIN.
    if (requesterRole !== "OWNER" && requesterRole !== "ADMIN") {
      throw new InviteForbiddenError("Only OWNER or ADMIN can create invites.");
    }

    // 3) Hierarchy: only OWNER can invite ADMIN; ADMIN can only invite MEMBER.
    if (targetRole === "ADMIN" && requesterRole !== "OWNER") {
      throw new InviteForbiddenError("Only OWNER can invite an ADMIN.");
    }
    if (requesterRole === "ADMIN" && targetRole !== "MEMBER") {
      throw new InviteForbiddenError("ADMIN can only invite MEMBER.");
    }

    // 4) Create invite (upsert to refresh expiration if same org/email).
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.organizationInvite.upsert({
      where: {
        org_invite_org_email_unique: {
          organizationId,
          email: guestEmail.toLowerCase().trim(),
        },
      },
      create: {
        organizationId,
        email: guestEmail.toLowerCase().trim(),
        role: targetRole,
        expiresAt,
      },
      update: {
        role: targetRole,
        expiresAt,
      },
    });

    // 5) Send magic link to guest. Redirect to /auth/callback so we can apply the invite.
    const { error } = await supabase.auth.signInWithOtp({
      email: invite.email,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });

    if (error) {
      const detail =
        [error.message, error.status != null ? String(error.status) : "", (error as { code?: string }).code]
          .filter(Boolean)
          .join(" | ") || error.message;
      if (process.env.NODE_ENV !== "test") {
        console.error("[InviteService] signInWithOtp failed:", {
          email: invite.email,
          message: error.message,
          status: error.status,
          code: (error as { code?: string }).code,
        });
      }
      throw new InviteError(detail);
    }

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    };
  } catch (err) {
    if (
      err instanceof InviteError ||
      err instanceof InviteForbiddenError ||
      err instanceof InviteValidationError
    ) {
      throw err;
    }
    if (err instanceof Error) {
      throw new InviteError(err.message);
    }
    throw new InviteError("Failed to create invite.");
  }
}
