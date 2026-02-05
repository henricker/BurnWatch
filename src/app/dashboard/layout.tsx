import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardShell } from "@/components/dashboard-shell";
import { getSessionProfile } from "@/lib/auth-server";
import { ROLE_LABELS } from "@/lib/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, organization } = await getSessionProfile();
  const roleLabel = ROLE_LABELS[profile.role];

  return (
    <SidebarProvider>
      <DashboardShell
        organizationName={organization.name}
        roleLabel={roleLabel}
        organizationId={organization.id}
        theme={profile.theme}
        locale={profile.locale}
      >
        {children}
      </DashboardShell>
    </SidebarProvider>
  );
}
