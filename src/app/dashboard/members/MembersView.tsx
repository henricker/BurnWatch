"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { Users, Search, Shield, Mail, Clock } from "lucide-react";
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
  expiresAt: string;
};

function StatCard({
  label,
  value,
  subtext,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  subtext: string;
  icon: React.ReactNode;
  color: "orange" | "blue" | "zinc";
}) {
  const colorStyles = {
    orange:
      "text-orange-500 bg-orange-500/5 border-orange-500/10 dark:border-orange-500/20",
    blue: "text-blue-500 bg-blue-500/5 border-blue-500/10 dark:border-blue-500/20",
    zinc:
      "text-muted-foreground bg-muted/50 border-border",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md group">
      <div
        className={`absolute top-0 right-0 rounded-bl-lg border p-2 opacity-20 transition-transform group-hover:scale-110 ${colorStyles[color]}`}
      >
        {icon}
      </div>
      <div className="relative z-10">
        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tighter text-foreground">
            {value}
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            {subtext}
          </span>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    OWNER:
      "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-500 shadow-sm",
    ADMIN:
      "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm",
    MEMBER: "border-border bg-muted text-muted-foreground",
  };
  const tRoles = useTranslations("Roles");
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${styles[role] ?? styles.MEMBER}`}
    >
      {tRoles(role)}
    </span>
  );
}

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
  const allowManage = canManageMembers(profileRole);
  const allowInviteAdmin = profileRole === "OWNER";
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      const name = [m.firstName, m.lastName].filter(Boolean).join(" ").toLowerCase();
      return name.includes(q);
    });
  }, [members, searchQuery]);

  const adminCount = members.filter(
    (m) => m.role === "OWNER" || m.role === "ADMIN",
  ).length;

  return (
    <div className="min-h-screen space-y-8 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {t("title")}
              </h1>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("subtitle")}
              </p>
            </div>
          </div>
          {allowManage && (
            <InviteMemberButton
              organizationId={organizationId}
              allowInviteAdmin={allowInviteAdmin}
              buttonLabel={t("newMemberButton")}
            />
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label={t("statSeatsActive")}
            value={members.length}
            subtext={t("statSeatsSubtext")}
            icon={<Users className="h-4 w-4" />}
            color="orange"
          />
          <StatCard
            label={t("statPending")}
            value={pendingInvites.length}
            subtext={t("statPendingSubtext")}
            icon={<Mail className="h-4 w-4" />}
            color="blue"
          />
          <StatCard
            label={t("statAdmins")}
            value={String(adminCount)}
            subtext={t("statAdminsSubtext")}
            icon={<Shield className="h-4 w-4" />}
            color="zinc"
          />
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              className="w-full border-none bg-transparent py-1 pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Active members table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("teamActive")}
            </h3>
            <span className="rounded border border-primary/10 bg-primary/5 px-2 py-0.5 font-mono text-[10px] text-primary">
              {t("prodReady")}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t("member")}
                  </th>
                  <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t("access")}
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t("status")}
                  </th>
                  {allowManage && (
                    <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {t("actions")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMembers.map((m) => (
                  <tr
                    key={m.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 overflow-hidden rounded-full border border-border shadow-inner">
                          <MemberAvatar
                            avatarUrl={m.avatarUrl}
                            avatarPath={m.avatarPath}
                            firstName={m.firstName}
                            lastName={m.lastName}
                            size="sm"
                            className="h-full w-full"
                          />
                        </div>
                        <div>
                          <p className="font-bold tracking-tight text-foreground">
                            {[m.firstName, m.lastName].filter(Boolean).join(" ") ||
                              "—"}
                            {m.isCurrentUser && (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                {t("you")}
                              </span>
                            )}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            —
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <RoleBadge role={m.role} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                          aria-hidden
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">
                          {t("active")}
                        </span>
                      </div>
                    </td>
                    {allowManage && (
                      <td className="px-6 py-4 text-right">
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
        </div>

        {/* Pending invites */}
        <div className="overflow-hidden rounded-xl border border-border bg-card opacity-95 shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("pendingInvites")}
            </h3>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-blue-500" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-blue-500">
                {t("awaitingAccept")}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            {pendingInvites.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">
                {t("noPendingInvites")}
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-border">
                  {pendingInvites.map((inv) => (
                    <tr
                      key={inv.id}
                      className="transition-colors hover:bg-muted/10"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/30">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <p className="font-mono text-xs text-foreground">
                            {inv.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className="rounded border border-border bg-muted/50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                            {inv.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] italic text-muted-foreground">
                        {t("expires")}: {inv.expiresAt}
                      </td>
                      {allowManage && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <ResendInviteButton
                              organizationId={organizationId}
                              email={inv.email}
                              targetRole={inv.role}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
