import { getSessionProfile } from "@/lib/auth-server";
import { getProfileAvatarSignedUrl, getProfileAvatarUrl } from "@/lib/avatar";
import { canDeleteOrganization, ROLE_LABELS } from "@/lib/roles";

import { ProfileEditForm } from "./ProfileEditForm";

export default async function SettingsPage() {
  const { profile, organization } = await getSessionProfile();
  const roleLabel = ROLE_LABELS[profile.role];
  const showDeleteOrg = canDeleteOrganization(profile.role);

  const avatarUrl =
    (await getProfileAvatarSignedUrl(profile.avatarPath)) ??
    getProfileAvatarUrl(profile.avatarPath);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-medium text-foreground">Perfil</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Edite seu nome, sobrenome e avatar.
        </p>
        <div className="mt-4">
          <ProfileEditForm
            userId={profile.userId}
            organizationId={organization.id}
            initialFirstName={profile.firstName}
            initialLastName={profile.lastName}
            initialAvatarPath={profile.avatarPath}
            initialAvatarUrl={avatarUrl}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-medium text-foreground">
          Organization
        </h2>
        <p className="mt-1 text-sm text-foreground">
          {organization.name}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Your role: {roleLabel}
        </p>
      </section>

      {showDeleteOrg && (
        <section className="rounded-xl border border-border border-destructive/30 bg-card p-6">
          <h2 className="text-lg font-medium text-destructive">
            Danger zone
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deleting the organization will remove all members, cloud accounts,
            and billing data. This cannot be undone.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            (Delete organization will be implemented in a future milestone.)
          </p>
        </section>
      )}
    </div>
  );
}
