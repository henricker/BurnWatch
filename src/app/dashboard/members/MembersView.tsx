"use client";

import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { canManageMembers } from "@/lib/roles";

import { InviteMemberButton } from "./InviteMemberButton";
import { MemberAvatar } from "./MemberAvatar";
import { RemoveMemberButton } from "./RemoveMemberButton";
import { ResendInviteButton } from "./ResendInviteButton";

export type MemberRow = {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  role: Role;
  isCurrentUser: boolean;
  isProtected: boolean;
};

export type PendingInviteRow = {
  id: string;
  email: string;
  role: Role;
};

export function MembersView({
  organizationId,
  profileRole,
  members,
  pendingInvites,
}: {
  organizationId: string;
  profileRole: Role;
  members: MemberRow[];
  pendingInvites: PendingInviteRow[];
}) {
  const t = useTranslations("Members");
  const tRoles = useTranslations("Roles");
  const allowManage = canManageMembers(profileRole);
  const allowInviteAdmin = profileRole === "OWNER";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        {allowManage && (
          <InviteMemberButton
            organizationId={organizationId}
            currentUserRole={profileRole}
            allowInviteAdmin={allowInviteAdmin}
          />
        )}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium text-foreground">
          {t("currentMembers")}
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("member")}</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">{t("status")}</th>
                {allowManage && (
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("actions")}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
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
                              {t("you")}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{tRoles(m.role)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-full bg-emerald-500"
                        aria-hidden
                      />
                      {t("active")}
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

      <section>
        <h2 className="mb-3 text-lg font-medium text-foreground">
          {t("pendingInvites")}
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {pendingInvites.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t("noPendingInvites")}
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("member")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("role")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("status")}</th>
                  {allowManage && (
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("actions")}</th>
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
                      {tRoles(inv.role)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <span
                          className="h-2 w-2 rounded-full bg-amber-500"
                          aria-hidden
                        />
                        {t("pending")}
                      </span>
                    </td>
                    {allowManage && (
                      <td className="px-4 py-3">
                        <ResendInviteButton
                          organizationId={organizationId}
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
