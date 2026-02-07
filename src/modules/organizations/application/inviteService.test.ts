import type { PrismaClient } from "@prisma/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  createInvite,
  InviteError,
  InviteForbiddenError,
} from "./inviteService";

function createMocks() {
  const profileFindFirst = vi.fn();
  const inviteUpsert = vi.fn();
  const signInWithOtp = vi.fn();

  const prisma = {
    profile: { findFirst: profileFindFirst },
    organizationInvite: { upsert: inviteUpsert },
  } as unknown as PrismaClient;

  const supabase = {
    auth: {
      signInWithOtp,
    },
  } as unknown as SupabaseClient;

  return { prisma, supabase, profileFindFirst, inviteUpsert, signInWithOtp };
}

describe("createInvite", () => {
  const orgId = "org-1";
  const adminId = "admin-user-id";
  const guestEmail = "guest@example.com";

  it("throws InviteForbiddenError when requester does not belong to organization", async () => {
    const { prisma, supabase, profileFindFirst } = createMocks();
    profileFindFirst.mockResolvedValue(null);

    await expect(
      createInvite(prisma, supabase, {
        adminId,
        organizationId: orgId,
        guestEmail,
        targetRole: "MEMBER",
      }),
    ).rejects.toThrow(InviteForbiddenError);

    expect(profileFindFirst).toHaveBeenCalledWith({
      where: { userId: adminId, organizationId: orgId },
    });
  });

  it("throws InviteForbiddenError when requester is MEMBER (only OWNER or ADMIN can invite)", async () => {
    const { prisma, supabase, profileFindFirst } = createMocks();
    profileFindFirst.mockResolvedValue({
      userId: adminId,
      organizationId: orgId,
      role: "MEMBER",
    });

    await expect(
      createInvite(prisma, supabase, {
        adminId,
        organizationId: orgId,
        guestEmail,
        targetRole: "MEMBER",
      }),
    ).rejects.toThrow(InviteForbiddenError);
  });

  it("throws InviteForbiddenError when ADMIN tries to invite ADMIN (only OWNER can invite ADMIN)", async () => {
    const { prisma, supabase, profileFindFirst } = createMocks();
    profileFindFirst.mockResolvedValue({
      userId: adminId,
      organizationId: orgId,
      role: "ADMIN",
    });

    await expect(
      createInvite(prisma, supabase, {
        adminId,
        organizationId: orgId,
        guestEmail,
        targetRole: "ADMIN",
      }),
    ).rejects.toThrow(InviteForbiddenError);
  });

  it("throws InviteForbiddenError when ADMIN invites with role other than MEMBER", async () => {
    const { prisma, supabase, profileFindFirst } = createMocks();
    profileFindFirst.mockResolvedValue({
      userId: adminId,
      organizationId: orgId,
      role: "ADMIN",
    });

    await expect(
      createInvite(prisma, supabase, {
        adminId,
        organizationId: orgId,
        guestEmail,
        targetRole: "ADMIN",
      }),
    ).rejects.toThrow(InviteForbiddenError);
  });

  it("creates invite and sends magic link when ADMIN invites MEMBER", async () => {
    const { prisma, supabase, profileFindFirst, inviteUpsert, signInWithOtp } =
      createMocks();

    profileFindFirst.mockResolvedValue({
      userId: adminId,
      organizationId: orgId,
      role: "ADMIN",
    });

    const expiresAt = new Date();
    inviteUpsert.mockResolvedValue({
      id: "invite-id",
      email: guestEmail.toLowerCase().trim(),
      role: "MEMBER",
      expiresAt,
    });
    signInWithOtp.mockResolvedValue({ data: {}, error: null });

    const result = await createInvite(prisma, supabase, {
      adminId,
      organizationId: orgId,
      guestEmail,
      targetRole: "MEMBER",
      emailRedirectTo: "https://app.example.com/auth/callback",
    });

    expect(result).toEqual({
      id: "invite-id",
      email: guestEmail.toLowerCase().trim(),
      role: "MEMBER",
      expiresAt,
    });
    expect(inviteUpsert).toHaveBeenCalledWith({
      where: {
        org_invite_org_email_unique: {
          organizationId: orgId,
          email: guestEmail.toLowerCase().trim(),
        },
      },
      create: expect.objectContaining({
        organizationId: orgId,
        email: guestEmail.toLowerCase().trim(),
        role: "MEMBER",
      }),
      update: expect.objectContaining({
        role: "MEMBER",
      }),
    });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: guestEmail.toLowerCase().trim(),
      options: { emailRedirectTo: "https://app.example.com/auth/callback" },
    });
  });

  it("creates invite when OWNER invites ADMIN", async () => {
    const { prisma, supabase, profileFindFirst, inviteUpsert, signInWithOtp } =
      createMocks();

    profileFindFirst.mockResolvedValue({
      userId: adminId,
      organizationId: orgId,
      role: "OWNER",
    });

    const expiresAt = new Date();
    inviteUpsert.mockResolvedValue({
      id: "invite-id",
      email: guestEmail,
      role: "ADMIN",
      expiresAt,
    });
    signInWithOtp.mockResolvedValue({ data: {}, error: null });

    const result = await createInvite(prisma, supabase, {
      adminId,
      organizationId: orgId,
      guestEmail,
      targetRole: "ADMIN",
    });

    expect(result.role).toBe("ADMIN");
    expect(signInWithOtp).toHaveBeenCalled();
  });

  it("throws InviteError when signInWithOtp fails", async () => {
    const { prisma, supabase, profileFindFirst, inviteUpsert, signInWithOtp } =
      createMocks();

    profileFindFirst.mockResolvedValue({
      userId: adminId,
      organizationId: orgId,
      role: "OWNER",
    });
    inviteUpsert.mockResolvedValue({
      id: "invite-id",
      email: guestEmail,
      role: "MEMBER",
      expiresAt: new Date(),
    });
    signInWithOtp.mockResolvedValue({
      data: {},
      error: { message: "Rate limit exceeded", status: 429 },
    });

    await expect(
      createInvite(prisma, supabase, {
        adminId,
        organizationId: orgId,
        guestEmail,
        targetRole: "MEMBER",
      }),
    ).rejects.toThrow(InviteError);
  });
});
