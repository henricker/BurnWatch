import type { PrismaClient } from "@prisma/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { CreateInviteUseCase } from "./index";
import { InviteError, InviteForbiddenError, PlanLimitReachedError } from "../../../domain/invite";

function createMocks() {
  const profileFindFirst = vi.fn();
  const organizationFindUnique = vi.fn();
  const inviteUpsert = vi.fn();
  const signInWithOtp = vi.fn();

  organizationFindUnique.mockResolvedValue({
    subscription: null,
    profiles: [{}, {}],
    organizationInvites: [],
  });

  const prisma = {
    profile: { findFirst: profileFindFirst },
    organization: { findUnique: organizationFindUnique },
    organizationInvite: { upsert: inviteUpsert },
  } as unknown as PrismaClient;

  const supabase = {
    auth: {
      signInWithOtp,
    },
  } as unknown as SupabaseClient;

  return { prisma, supabase, profileFindFirst, organizationFindUnique, inviteUpsert, signInWithOtp };
}

describe("CreateInviteUseCase", () => {
  const orgId = "org-1";
  const adminId = "admin-user-id";
  const guestEmail = "guest@example.com";

  it("throws InviteForbiddenError when requester does not belong to organization", async () => {
    const { prisma, supabase, profileFindFirst } = createMocks();
    profileFindFirst.mockResolvedValue(null);

    await expect(
      new CreateInviteUseCase(prisma, supabase).execute({
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
      new CreateInviteUseCase(prisma, supabase).execute({
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
      new CreateInviteUseCase(prisma, supabase).execute({
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
      new CreateInviteUseCase(prisma, supabase).execute({
        adminId,
        organizationId: orgId,
        guestEmail,
        targetRole: "ADMIN",
      }),
    ).rejects.toThrow(InviteForbiddenError);
  });

  it("throws PlanLimitReachedError when plan is STARTER and org already has 3 members", async () => {
    const { prisma, supabase, profileFindFirst, organizationFindUnique } = createMocks();
    profileFindFirst.mockResolvedValue({
      userId: adminId,
      organizationId: orgId,
      role: "OWNER",
    });
    organizationFindUnique.mockResolvedValue({
      subscription: { plan: "STARTER" },
      profiles: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
    });

    await expect(
      new CreateInviteUseCase(prisma, supabase).execute({
        adminId,
        organizationId: orgId,
        guestEmail,
        targetRole: "MEMBER",
      }),
    ).rejects.toThrow(PlanLimitReachedError);
  });

  it("throws PlanLimitReachedError when plan is STARTER with 2 members and 1 pending invite", async () => {
    const { prisma, supabase, profileFindFirst, organizationFindUnique } = createMocks();
    profileFindFirst.mockResolvedValue({
      userId: adminId,
      organizationId: orgId,
      role: "OWNER",
    });
    organizationFindUnique.mockResolvedValue({
      subscription: { plan: "STARTER" },
      profiles: [{ id: "p1" }, { id: "p2" }],
      organizationInvites: [{ id: "invite-1", email: "other@example.com" }],
    });

    await expect(
      new CreateInviteUseCase(prisma, supabase).execute({
        adminId,
        organizationId: orgId,
        guestEmail,
        targetRole: "MEMBER",
      }),
    ).rejects.toThrow(PlanLimitReachedError);
  });

  it("allows re-sending the same pending invite email on STARTER when org has 2 members", async () => {
    const { prisma, supabase, profileFindFirst, organizationFindUnique, inviteUpsert, signInWithOtp } = createMocks();
    profileFindFirst.mockResolvedValue({
      userId: adminId,
      organizationId: orgId,
      role: "OWNER",
    });
    organizationFindUnique.mockResolvedValue({
      subscription: { plan: "STARTER" },
      profiles: [{ id: "p1" }, { id: "p2" }],
      organizationInvites: [],
    });
    inviteUpsert.mockResolvedValue({
      id: "invite-id",
      email: guestEmail.toLowerCase().trim(),
      role: "MEMBER",
      expiresAt: new Date(),
    });
    signInWithOtp.mockResolvedValue({ data: {}, error: null });

    const useCase = new CreateInviteUseCase(prisma, supabase);
    const normalizedEmail = guestEmail.toLowerCase().trim();
    const result = await useCase.execute({
      adminId,
      organizationId: orgId,
      guestEmail,
      targetRole: "MEMBER",
    });

    expect(result).toHaveProperty("id", "invite-id");
    expect(organizationFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: orgId },
        include: expect.objectContaining({
          organizationInvites: expect.objectContaining({
            where: expect.objectContaining({
              email: { not: normalizedEmail },
              expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
            }),
          }),
        }),
      }),
    );
  });

  it("allows invite when plan is PRO and org has 3 or more members", async () => {
    const { prisma, supabase, profileFindFirst, organizationFindUnique, inviteUpsert, signInWithOtp } = createMocks();
    profileFindFirst.mockResolvedValue({
      userId: adminId,
      organizationId: orgId,
      role: "OWNER",
    });
    organizationFindUnique.mockResolvedValue({
      subscription: { plan: "PRO" },
      profiles: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
    });
    inviteUpsert.mockResolvedValue({
      id: "invite-id",
      email: guestEmail.toLowerCase().trim(),
      role: "MEMBER",
      expiresAt: new Date(),
    });
    signInWithOtp.mockResolvedValue({ data: {}, error: null });

    const result = await new CreateInviteUseCase(prisma, supabase).execute({
      adminId,
      organizationId: orgId,
      guestEmail,
      targetRole: "MEMBER",
    });

    expect(result).toHaveProperty("id", "invite-id");
    expect(result.email).toBe(guestEmail.toLowerCase().trim());
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

    const useCase = new CreateInviteUseCase(prisma, supabase);
    const result = await useCase.execute({
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

    const useCase = new CreateInviteUseCase(prisma, supabase);
    const result = await useCase.execute({
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
      new CreateInviteUseCase(prisma, supabase).execute({
        adminId,
        organizationId: orgId,
        guestEmail,
        targetRole: "MEMBER",
      }),
    ).rejects.toThrow(InviteError);
  });
});
