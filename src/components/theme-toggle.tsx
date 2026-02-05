"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchWithRetry } from "@/lib/safe-fetch";

type Theme = "light" | "dark" | "system";

function saveThemeToProfileInBackground(
  organizationId: string,
  theme: string,
): void {
  fetchWithRetry("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId, theme }),
  }).catch(() => {
    // Theme already applied in UI; profile sync failed, will use local preference next time
  });
}

export function ThemeToggle({
  organizationId,
  currentTheme = "system",
}: {
  organizationId?: string;
  currentTheme?: string | null;
}) {
  const t = useTranslations("Theme");
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const value = (theme ?? currentTheme ?? "system") as Theme;

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleSelect(next: Theme) {
    setTheme(next);
    if (organizationId) {
      saveThemeToProfileInBackground(organizationId, next);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9">
          {!mounted ? (
            <span className="size-4" aria-hidden />
          ) : resolvedTheme === "dark" ? (
            <Moon className="size-4" />
          ) : resolvedTheme === "light" ? (
            <Sun className="size-4" />
          ) : (
            <Monitor className="size-4" />
          )}
          <span className="sr-only">{t("label")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => handleSelect(v as Theme)}>
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 size-4" />
            {t("light")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 size-4" />
            {t("dark")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 size-4" />
            {t("system")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
