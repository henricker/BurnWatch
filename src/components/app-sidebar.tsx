"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { LayoutDashboard, LogOut, Users, Settings } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar({
  organizationName,
  profileRole,
}: {
  organizationName: string;
  profileRole: Role;
}) {
  const t = useTranslations("Sidebar");
  const tRoles = useTranslations("Roles");
  const pathname = usePathname();
  const router = useRouter();
  const roleLabel = tRoles(profileRole);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  const navItems = [
    { href: "/dashboard", labelKey: "dashboard" as const, icon: LayoutDashboard },
    { href: "/dashboard/members", labelKey: "members" as const, icon: Users },
    { href: "/dashboard/settings", labelKey: "settings" as const, icon: Settings },
  ] as const;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex flex-col gap-0.5 px-2 py-2">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">
            {organizationName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, labelKey, icon: Icon }) => {
                const label = t(labelKey);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === href || (href !== "/dashboard" && pathname.startsWith(href))}
                      tooltip={label}
                    >
                      <Link href={href}>
                        <Icon className="size-4 shrink-0" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="mt-auto flex justify-center border-t border-sidebar-border">
        <SidebarMenuButton
          onClick={() => void handleLogout()}
          tooltip={t("logout")}
          className="w-full justify-center"
        >
          <LogOut className="size-4 shrink-0" />
          <span>{t("logout")}</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
