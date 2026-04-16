import { getProfileAvatarSignedUrl, getProfileAvatarUrl } from "@/lib/avatar";
import { getSessionProfile } from "@/lib/auth-server";
import { hasActiveSubscriptionAccess } from "@/modules/subscriptions/domain/has-active-subscription-access";

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

  const hasActiveAccess = hasActiveSubscriptionAccess(organization);
  const subscriptionRequired = !hasActiveAccess;
  const allowTrial = subscriptionRequired && !organization.subscriptionId;

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
          avatarUrl={avatarUrl}
          profileDisplayName={[profile.firstName, profile.lastName].filter(Boolean).join(" ") || null}
          subscriptionRequired={subscriptionRequired}
          allowTrial={allowTrial}
        >
          {children}
        </DashboardShell>
      </CompleteProfileGate>
    </SidebarProvider>
  );
}
