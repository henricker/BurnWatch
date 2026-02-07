"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocaleOverride } from "@/components/locale-override-provider";
import { LOCALES, type Locale } from "@/i18n/locales";
import { Globe } from "lucide-react";

/**
 * Botão flutuante para alternar idioma na landing (en / pt / es).
 * Mesmo padrão visual do LandingThemeToggle; não persiste em perfil.
 */
export function LandingLocaleToggle() {
  const t = useTranslations("Locale");
  const { effectiveLocale, setLocaleOverride } = useLocaleOverride();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(locale: Locale) {
    setLocaleOverride(locale);
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setOpen(false);
  }

  return (
    <div className="landing-locale-toggle fixed bottom-8 right-24 z-50" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={t("label")}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-lg transition-all hover:scale-110 hover:border-orange-500/50 hover:shadow-orange-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-500/50 dark:hover:shadow-orange-500/20"
      >
        <Globe className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => handleSelect(locale)}
              className={`block w-full px-4 py-2 text-left text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                effectiveLocale === locale
                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  : "text-zinc-700 dark:text-zinc-200"
              }`}
            >
              {t(locale)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
