"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import type { Role } from "@prisma/client";
import {
  CloudCog,
  LayoutDashboard,
  Users,
  Settings,
  Zap,
  LogOut,
  User,
  Sun,
  Moon,
  ShieldCheck,
  Globe,
} from "lucide-react";

import { useLocaleOverride } from "@/components/locale-override-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchWithRetry } from "@/lib/safe-fetch";
import { isValidLocale, type Locale } from "@/i18n/locales";
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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALES: Locale[] = ["pt", "en", "es"];

function saveThemeToProfile(organizationId: string, theme: string): void {
  fetchWithRetry("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId, theme }),
  }).catch(() => {});
}

export function AppSidebar({
  organizationName,
  profileRole,
  organizationId,
  locale: profileLocale,
  avatarUrl,
  profileDisplayName,
}: {
  organizationName: string;
  profileRole: Role;
  organizationId?: string;
  theme?: string | null;
  locale?: string | null;
  avatarUrl?: string | null;
  profileDisplayName?: string | null;
}) {
  const t = useTranslations("Sidebar");
  const tRoles = useTranslations("Roles");
  const tTheme = useTranslations("Theme");
  const tLocale = useTranslations("Locale");
  const pathname = usePathname();
  const router = useRouter();
  const { state: sidebarState } = useSidebar();
  const { setTheme, resolvedTheme } = useTheme();
  const localeContext = useLocaleOverride();
  const [mounted, setMounted] = useState(false);

  const isCollapsed = sidebarState === "collapsed";

  const effectiveLocale: Locale =
    localeContext?.effectiveLocale ??
    (profileLocale && isValidLocale(profileLocale) ? profileLocale : "pt");

  useEffect(() => {
    // This is safe: it only gates client-only UI (Radix IDs, theme icons) after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const roleLabel = tRoles(profileRole);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  function handleThemeChange(next: "light" | "dark") {
    setTheme(next);
    if (organizationId) saveThemeToProfile(organizationId, next);
  }

  function handleLocaleSelect(next: Locale) {
    localeContext?.setLocaleOverride(next, organizationId);
  }

  const navItems = [
    { href: "/dashboard", labelKey: "dashboard" as const, icon: LayoutDashboard },
    { href: "/dashboard/connections", labelKey: "connections" as const, icon: CloudCog },
    { href: "/dashboard/members", labelKey: "members" as const, icon: Users },
    { href: "/dashboard/settings", labelKey: "settings" as const, icon: Settings },
  ] as const;

  const displayName =
    profileDisplayName?.trim() || roleLabel;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-[#050505] transition-colors duration-300 group-data-[collapsible=icon]:w-[4rem]"
    >
      <div className="absolute left-0 top-0 h-64 w-full bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none" />

      <SidebarHeader className="relative z-10 p-4 group-data-[collapsible=icon]:pl-6 group-data-[collapsible=icon]:pr-2 group-data-[collapsible=icon]:py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#0a0a0a] px-2 py-1.5 transition-colors group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                <Zap className="size-4 fill-white" />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 leading-none overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  {organizationName}
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-600 dark:text-orange-500/80">
                  {roleLabel}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="relative z-10 px-3 group-data-[collapsible=icon]:px-4">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-3 px-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-zinc-600">
            {t("navigation")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map(({ href, labelKey, icon: Icon }) => {
                const label = t(labelKey);
                const isActive =
                  pathname === href ||
                  (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={label}
                      className={`relative rounded-lg transition-all duration-200 group ${
                        isActive
                          ? "bg-orange-500/10 font-bold text-orange-600 dark:text-orange-500"
                          : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-900/50 dark:hover:text-white"
                      }`}
                    >
                      <Link href={href} className="flex w-full items-center px-3 py-2">
                        <span
                          className={
                            isActive
                              ? "text-orange-600 dark:text-orange-500"
                              : "text-slate-400 dark:text-zinc-500 transition-colors group-hover:text-orange-500/70"
                          }
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="ml-2 text-xs uppercase tracking-[0.05em]">
                          {label}
                        </span>
                        {isActive && (
                          <div className="absolute right-3 h-1 w-1 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(249,115,22,0.8)] dark:bg-orange-500" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="relative z-10 flex flex-col gap-2 border-t border-slate-200 dark:border-zinc-800/50 bg-slate-50/50 dark:bg-[#070707]/50 p-4 group-data-[collapsible=icon]:px-4 group-data-[collapsible=icon]:gap-3 group-data-[collapsible=icon]:pb-3">
        {/* Theme */}
        <div
          className={
            isCollapsed
              ? "flex justify-center rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/50 p-2"
              : "mb-2 flex items-center justify-between rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/50 px-2 py-1"
          }
        >
          {!isCollapsed && (
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
              {t("appearance")}
            </span>
          )}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              title={tTheme("light")}
              className={`rounded-md p-1.5 transition-all ${
                mounted && resolvedTheme === "light"
                  ? "border border-slate-200 bg-white text-orange-500 shadow-sm dark:border-zinc-700"
                  : "text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              <Sun size={12} />
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              title={tTheme("dark")}
              className={`rounded-md p-1.5 transition-all ${
                mounted && resolvedTheme === "dark"
                  ? "border border-zinc-800 bg-[#0a0a0a] text-orange-500 shadow-sm"
                  : "text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              <Moon size={12} />
            </button>
          </div>
        </div>

        {/* Locale - only render Dropdown after mount to avoid Radix ID hydration mismatch */}
        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={tLocale("label")}
                className={
                  isCollapsed
                    ? "flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/50 text-slate-600 dark:text-zinc-300 transition-colors hover:bg-slate-200/50 dark:hover:bg-zinc-800/50"
                    : "flex w-full items-center justify-between rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/50 px-2 py-1.5 text-left transition-colors hover:bg-slate-200/50 dark:hover:bg-zinc-800/50"
                }
              >
                {isCollapsed ? (
                  <Globe className="size-4 shrink-0" />
                ) : (
                  <>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                      {tLocale("label")}
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-700 dark:text-zinc-300">
                      {tLocale(effectiveLocale)}
                    </span>
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              className="w-40 border-slate-200 bg-white dark:border-zinc-800 dark:bg-[#0a0a0a]"
            >
              {LOCALES.map((loc) => (
                <DropdownMenuItem
                  key={loc}
                  onClick={() => handleLocaleSelect(loc)}
                  className={`cursor-pointer text-xs ${
                    effectiveLocale === loc
                      ? "bg-orange-500/10 font-medium text-orange-600 dark:text-orange-500"
                      : ""
                  }`}
                >
                  {tLocale(loc)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div
            className={
              isCollapsed
                ? "flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/50 text-slate-600 dark:text-zinc-300"
                : "flex w-full items-center justify-between rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/50 px-2 py-1.5"
            }
            aria-hidden
          >
            {isCollapsed ? (
              <Globe className="size-4 shrink-0" />
            ) : (
              <>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                  {tLocale("label")}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-slate-700 dark:text-zinc-300">
                  {tLocale(effectiveLocale)}
                </span>
              </>
            )}
          </div>
        )}

        {/* User + Logout - only render Dropdown after mount to avoid Radix ID hydration mismatch */}
        <SidebarMenu>
          <SidebarMenuItem>
            {mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="w-full justify-start border border-transparent transition-all hover:border-slate-300 hover:bg-slate-200 dark:hover:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-orange-500/20 bg-orange-500/5 p-0.5 shadow-sm">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt=""
                          className="size-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="size-4 text-orange-500" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5 leading-none overflow-hidden">
                      <span className="truncate text-xs font-bold text-slate-900 dark:text-zinc-200">
                        {displayName}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 dark:text-zinc-500">
                        {roleLabel}
                      </span>
                    </div>
                    <ShieldCheck className="ml-auto size-3 text-orange-500 opacity-50" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="right"
                  className="w-56 border-slate-200 bg-white dark:border-zinc-800 dark:bg-[#0a0a0a]"
                >
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                    {t("accountManagement")}
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs focus:bg-orange-500/10 focus:text-orange-600 dark:focus:text-orange-500">
                    <Link href="/dashboard/settings">
                      <User className="size-4" />
                      {t("myProfile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-200 dark:bg-zinc-800" />
                  <DropdownMenuItem
                    onClick={() => void handleLogout()}
                    className="cursor-pointer gap-2 text-xs font-bold text-red-600 focus:bg-red-500/10 focus:text-red-600 dark:text-red-500 dark:focus:text-red-500"
                  >
                    <LogOut className="size-4" />
                    {t("endSession")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div
                className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm border border-transparent"
                aria-hidden
              >
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-orange-500/20 bg-orange-500/5 p-0.5 shadow-sm">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt=""
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="size-4 text-orange-500" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5 leading-none overflow-hidden">
                  <span className="truncate text-xs font-bold text-slate-900 dark:text-zinc-200">
                    {displayName}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 dark:text-zinc-500">
                    {roleLabel}
                  </span>
                </div>
                <ShieldCheck className="ml-auto size-3 text-orange-500 opacity-50" />
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
