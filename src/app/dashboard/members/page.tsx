import { getSessionProfile } from "@/lib/auth-server";
import { getProfileAvatarSignedUrl, getProfileAvatarUrl } from "@/lib/avatar";
import { canManageMembers, ROLE_LABELS } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

import { InviteMemberButton } from "./InviteMemberButton";
import { MemberAvatar } from "./MemberAvatar";
import { RemoveMemberButton } from "./RemoveMemberButton";
import { ResendInviteButton } from "./ResendInviteButton";

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

  const membersWithMeta = await Promise.all(
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
        roleLabel: ROLE_LABELS[m.role],
        isCurrentUser: m.userId === profile.userId,
        isProtected: m.role === "OWNER",
      };
    }),
  );

  const allowManage = canManageMembers(profile.role);
  const allowInviteAdmin = profile.role === "OWNER";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Gerenciamento de Membros
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your connections
          </p>
        </div>
        {allowManage && (
          <InviteMemberButton
            organizationId={organization.id}
            currentUserRole={profile.role}
            allowInviteAdmin={allowInviteAdmin}
          />
        )}
      </div>

      {/* Membros Atuais */}
      <section>
        <h2 className="mb-3 text-lg font-medium text-foreground">
          Membros Atuais
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 font-medium text-muted-foreground">Membro</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                {allowManage && (
                  <th className="px-4 py-3 font-medium text-muted-foreground">Ações</th>
                )}
              </tr>
            </thead>
            <tbody>
              {membersWithMeta.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <MemberAvatar
                        avatarUrl={m.avatarUrl}
                        avatarPath={m.avatarPath}
                        firstName={m.firstName}
                        lastName={m.lastName}
                      />
                      <div>
                        <p className="font-medium text-foreground">
                          {[m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}
                          {m.isCurrentUser && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              (você)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{m.roleLabel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-full bg-emerald-500"
                        aria-hidden
                      />
                      Ativo
                    </span>
                  </td>
                  {allowManage && (
                    <td className="px-4 py-3">
                      {!m.isProtected && !m.isCurrentUser && (
                        <RemoveMemberButton
                          profileId={m.id}
                          memberName={[m.firstName, m.lastName]
                            .filter(Boolean)
                            .join(" ")}
                        />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Convites Pendentes */}
      <section>
        <h2 className="mb-3 text-lg font-medium text-foreground">
          Convites Pendentes
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {pendingInvites.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nenhum convite pendente.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Membro</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  {allowManage && (
                    <th className="px-4 py-3 font-medium text-muted-foreground">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm font-medium text-amber-600 dark:text-amber-400"
                          aria-hidden
                        >
                          {inv.email[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="text-foreground">{inv.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ROLE_LABELS[inv.role]}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <span
                          className="h-2 w-2 rounded-full bg-amber-500"
                          aria-hidden
                        />
                        Pendente
                      </span>
                    </td>
                    {allowManage && (
                      <td className="px-4 py-3">
                        <ResendInviteButton
                          organizationId={organization.id}
                          email={inv.email}
                          targetRole={inv.role}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
