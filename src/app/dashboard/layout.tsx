import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardShell } from "@/components/dashboard-shell";
import { getSessionProfile } from "@/lib/auth-server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, organization } = await getSessionProfile();

  return (
    <SidebarProvider>
      <DashboardShell
        organizationName={organization.name}
        profileRole={profile.role}
        organizationId={organization.id}
        theme={profile.theme}
        locale={profile.locale}
      >
        {children}
      </DashboardShell>
    </SidebarProvider>
  );
}
