import { getSessionProfile } from "@/lib/auth-server";
import { getProfileAvatarSignedUrl, getProfileAvatarUrl } from "@/lib/avatar";
import { prisma } from "@/lib/prisma";

import { MembersView, type MemberRow, type PendingInviteRow } from "./MembersView";

export default async function MembersPage() {
  const { profile, organization } = await getSessionProfile();
  const now = new Date();

  const [members, pendingInvites] = await Promise.all([
    prisma.profile.findMany({
      where: { organizationId: organization.id },
      orderBy: [
        { role: "asc" },
        { firstName: "asc" },
        { lastName: "asc" },
      ],
    }),
    prisma.organizationInvite.findMany({
      where: {
        organizationId: organization.id,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const membersWithMeta: MemberRow[] = await Promise.all(
    members.map(async (m) => {
      const avatarUrl =
        (await getProfileAvatarSignedUrl(m.avatarPath)) ??
        getProfileAvatarUrl(m.avatarPath);
      return {
        id: m.id,
        userId: m.userId,
        firstName: m.firstName,
        lastName: m.lastName,
        avatarPath: m.avatarPath,
        avatarUrl,
        role: m.role,
        isCurrentUser: m.userId === profile.userId,
        isProtected: m.role === "OWNER",
      };
    }),
  );

  const pendingInvitesRows: PendingInviteRow[] = pendingInvites.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    expiresAt: inv.expiresAt.toISOString().slice(0, 10),
  }));

  return (
    <MembersView
      organizationId={organization.id}
      profileRole={profile.role}
      members={membersWithMeta}
      pendingInvites={pendingInvitesRows}
    />
  );
}
