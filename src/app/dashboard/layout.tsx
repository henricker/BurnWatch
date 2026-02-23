import { getProfileAvatarSignedUrl, getProfileAvatarUrl } from "@/lib/avatar";
import { getSessionProfile } from "@/lib/auth-server";

import { CompleteProfileGate } from "@/components/complete-profile-gate";
import { DashboardShell } from "@/components/dashboard-shell";
import { SidebarProvider } from "@/components/ui/sidebar";

function hasActiveSubscriptionAccess(
  organization: { subscriptionId: string | null; subscription: { cancelAt: Date | null; currentPeriodEnd: Date | null } | null },
): boolean {
  if (!organization.subscriptionId || !organization.subscription) return false;
  const endDate = organization.subscription.cancelAt ?? organization.subscription.currentPeriodEnd;
  if (!endDate) return true;
  return new Date() <= endDate;
}

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
