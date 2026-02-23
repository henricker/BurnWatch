import type { PrismaClient } from "@prisma/client";
import type { Role } from "@prisma/client";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateInviteParams } from "../../../domain/invite";
import {
  InviteError,
  InviteForbiddenError,
  InviteValidationError,
  PlanLimitReachedError,
} from "../../../domain/invite";

export class CreateInviteUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly supabase: SupabaseClient,
  ) {}

  async execute(
    params: CreateInviteParams,
  ): Promise<{ id: string; email: string; role: Role; expiresAt: Date }> {
    const { adminId, organizationId, guestEmail, targetRole, emailRedirectTo } = params;
    const normalizedGuestEmail = guestEmail.toLowerCase().trim();
    const now = new Date();

    try {
      const requesterProfile = await this.prisma.profile.findFirst({
        where: { userId: adminId, organizationId },
      });

      if (!requesterProfile) {
        throw new InviteForbiddenError("Requester does not belong to this organization.");
      }

      const requesterRole = requesterProfile.role;
      if (requesterRole !== "OWNER" && requesterRole !== "ADMIN") {
        throw new InviteForbiddenError("Only OWNER or ADMIN can create invites.");
      }
      if (targetRole === "ADMIN" && requesterRole !== "OWNER") {
        throw new InviteForbiddenError("Only OWNER can invite an ADMIN.");
      }
      if (requesterRole === "ADMIN" && targetRole !== "MEMBER") {
        throw new InviteForbiddenError("ADMIN can only invite MEMBER.");
      }

      const orgWithSubscriptionAndProfiles = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          subscription: true,
          profiles: true,
          organizationInvites: {
            where: {
              expiresAt: { gt: now },
              email: { not: normalizedGuestEmail },
            },
          },
        },
      });
      const plan = orgWithSubscriptionAndProfiles?.subscription?.plan ?? "STARTER";
      const memberCount = orgWithSubscriptionAndProfiles?.profiles.length ?? 0;
      const pendingInviteCount = orgWithSubscriptionAndProfiles?.organizationInvites.length ?? 0;
      if (plan === "STARTER" && memberCount + pendingInviteCount >= 3) {
        throw new PlanLimitReachedError();
      }

      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const invite = await this.prisma.organizationInvite.upsert({
        where: {
          org_invite_org_email_unique: {
            organizationId,
            email: normalizedGuestEmail,
          },
        },
        create: {
          organizationId,
          email: normalizedGuestEmail,
          role: targetRole,
          expiresAt,
        },
        update: { role: targetRole, expiresAt },
      });

      const { error } = await this.supabase.auth.signInWithOtp({
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
        err instanceof InviteValidationError ||
        err instanceof PlanLimitReachedError
      ) {
        throw err;
      }
      if (err instanceof Error) {
        throw new InviteError(err.message);
      }
      throw new InviteError("Failed to create invite.");
    }
  }
}
