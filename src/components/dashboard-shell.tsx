"use client";

import type { Role } from "@prisma/client";
import { PreferencesSync } from "@/components/preferences-sync";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";

export function DashboardShell({
  organizationName,
  profileRole,
  organizationId,
  theme,
  locale,
  avatarUrl,
  profileDisplayName,
  children,
}: {
  organizationName: string;
  profileRole: Role;
  organizationId?: string;
  theme?: string | null;
  locale?: string | null;
  avatarUrl?: string | null;
  profileDisplayName?: string | null;
  children: React.ReactNode;
}) {
  return (
    <>
      <PreferencesSync theme={theme} />
      <AppSidebar
        organizationName={organizationName}
        profileRole={profileRole}
        organizationId={organizationId}
        theme={theme}
        locale={locale}
        avatarUrl={avatarUrl}
        profileDisplayName={profileDisplayName}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </SidebarInset>
    </>
  );
}
