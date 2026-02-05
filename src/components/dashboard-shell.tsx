"use client";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { PreferencesSync } from "@/components/preferences-sync";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";

export function DashboardShell({
  organizationName,
  roleLabel,
  organizationId,
  theme,
  locale,
  children,
}: {
  organizationName: string;
  roleLabel: string;
  organizationId?: string;
  theme?: string | null;
  locale?: string | null;
  children: React.ReactNode;
}) {
  return (
    <>
      <PreferencesSync theme={theme} />
      <AppSidebar organizationName={organizationName} roleLabel={roleLabel} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle organizationId={organizationId} currentTheme={theme} />
            <LocaleSwitcher organizationId={organizationId} currentLocale={locale} />
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </SidebarInset>
    </>
  );
}
