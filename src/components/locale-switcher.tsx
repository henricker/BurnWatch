"use client";

import { useTranslations } from "next-intl";
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
import { useLocaleOverride } from "@/components/locale-override-provider";
import { isValidLocale, type Locale } from "@/i18n/locales";

const LOCALES: Locale[] = ["pt", "en", "es"];

export function LocaleSwitcher({
  organizationId,
  currentLocale = "pt",
}: {
  organizationId?: string;
  currentLocale?: string | null;
}) {
  const t = useTranslations("Locale");
  const overrideContext = useLocaleOverride();
  const value: Locale = overrideContext?.effectiveLocale ?? (currentLocale && isValidLocale(currentLocale) ? currentLocale : "pt");

  function handleSelect(next: Locale) {
    overrideContext?.setLocaleOverride(next, organizationId);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9">
          <Languages className="size-4" />
          <span className="sr-only">{t("label")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => handleSelect(v as Locale)}>
          <DropdownMenuRadioItem value="pt">{t("pt")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">{t("en")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="es">{t("es")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
