"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
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
          <span className="sr-only">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => handleSelect(v as Theme)}>
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 size-4" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 size-4" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 size-4" />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
