"use client";

import { useTranslations } from "next-intl";
import { ProfileEditForm } from "./ProfileEditForm";

export function SettingsView({
  userId,
  organizationId,
  organizationName,
  profileRole,
  initialFirstName,
  initialLastName,
  initialAvatarPath,
  initialAvatarUrl,
  showDeleteOrg,
}: {
  userId: string;
  organizationId: string;
  organizationName: string;
  profileRole: string;
  initialFirstName: string | null;
  initialLastName: string | null;
  initialAvatarPath: string | null;
  initialAvatarUrl: string | null;
  showDeleteOrg: boolean;
}) {
  const t = useTranslations("Settings");
  const tRoles = useTranslations("Roles");
  const roleLabel = tRoles(profileRole as "OWNER" | "ADMIN" | "MEMBER");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-medium text-foreground">{t("profile")}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("profileDescription")}
        </p>
        <div className="mt-4">
          <ProfileEditForm
            userId={userId}
            organizationId={organizationId}
            initialFirstName={initialFirstName}
            initialLastName={initialLastName}
            initialAvatarPath={initialAvatarPath}
            initialAvatarUrl={initialAvatarUrl}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-medium text-foreground">
          {t("organization")}
        </h2>
        <p className="mt-1 text-sm text-foreground">
          {organizationName}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("yourRole", { role: roleLabel })}
        </p>
      </section>

      {showDeleteOrg && (
        <section className="rounded-xl border border-border border-destructive/30 bg-card p-6">
          <h2 className="text-lg font-medium text-destructive">
            {t("dangerZone")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dangerZoneDescription")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("dangerZoneFuture")}
          </p>
        </section>
      )}
    </div>
  );
}
