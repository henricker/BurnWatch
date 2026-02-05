"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
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

const LOCALES = ["pt", "en"] as const;
type Locale = (typeof LOCALES)[number];

async function saveLocaleToProfile(
  organizationId: string,
  locale: string,
): Promise<boolean> {
  try {
    const { fetchWithRetry } = await import("@/lib/safe-fetch");
    const res = await fetchWithRetry("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, locale }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function LocaleSwitcher({
  organizationId,
  currentLocale = "pt",
}: {
  organizationId?: string;
  currentLocale?: string | null;
}) {
  const router = useRouter();
  const value = (currentLocale && LOCALES.includes(currentLocale as Locale) ? currentLocale : "pt") as Locale;

  function handleSelect(next: Locale) {
    if (organizationId) {
      void saveLocaleToProfile(organizationId, next).then(() => {
        router.refresh();
      });
    } else {
      router.refresh();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9">
          <Languages className="size-4" />
          <span className="sr-only">Language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => handleSelect(v as Locale)}>
          <DropdownMenuRadioItem value="pt">PT</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">EN</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
