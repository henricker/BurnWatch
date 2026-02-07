import { getProfileAvatarSignedUrl, getProfileAvatarUrl } from "@/lib/avatar";
import { getSessionProfile } from "@/lib/auth-server";

import { CompleteProfileGate } from "@/components/complete-profile-gate";
import { DashboardShell } from "@/components/dashboard-shell";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, organization } = await getSessionProfile();

  const avatarUrl =
    (await getProfileAvatarSignedUrl(profile.avatarPath)) ??
    getProfileAvatarUrl(profile.avatarPath);

  return (
    <SidebarProvider>
      <CompleteProfileGate
        profile={{
          userId: profile.userId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarPath: profile.avatarPath,
        }}
        organizationId={organization.id}
        avatarUrl={avatarUrl}
      >
        <DashboardShell
          organizationName={organization.name}
          profileRole={profile.role}
          organizationId={organization.id}
          theme={profile.theme}
          locale={profile.locale}
        >
          {children}
        </DashboardShell>
      </CompleteProfileGate>
    </SidebarProvider>
  );
}
