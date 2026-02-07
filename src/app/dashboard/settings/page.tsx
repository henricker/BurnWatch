import { getSessionProfile } from "@/lib/auth-server";
import { getProfileAvatarSignedUrl, getProfileAvatarUrl } from "@/lib/avatar";
import {
  canDeleteOrganization,
  canUpdateOrganizationName,
} from "@/lib/roles";

import { SettingsView } from "./SettingsView";

export default async function SettingsPage() {
  const { profile, organization, email } = await getSessionProfile();
  const showDeleteOrg = canDeleteOrganization(profile.role);
  const canEditOrgName = canUpdateOrganizationName(profile.role);

  const avatarUrl =
    (await getProfileAvatarSignedUrl(profile.avatarPath)) ??
    getProfileAvatarUrl(profile.avatarPath);

  return (
    <SettingsView
      userId={profile.userId}
      organizationId={organization.id}
      organizationName={organization.name}
      profileRole={profile.role}
      initialFirstName={profile.firstName}
      initialLastName={profile.lastName}
      initialAvatarPath={profile.avatarPath}
      initialAvatarUrl={avatarUrl}
      email={email ?? undefined}
      showDeleteOrg={showDeleteOrg}
      canEditOrgName={canEditOrgName}
    />
  );
}
