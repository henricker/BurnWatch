export const LOCALES = ["pt", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export function isValidLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

/**
 * Detecta o locale preferido a partir do header Accept-Language (ex.: do navegador).
 * Usado na primeira carga e no middleware para definir NEXT_LOCALE.
 */
export function getPreferredLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return "en";
  const parts = acceptLanguage.split(",").map((s) => s.trim().split(";")[0]);
  for (const part of parts) {
    const code = part.slice(0, 2).toLowerCase();
    if (LOCALES.includes(code as Locale)) return code as Locale;
  }
  return "en";
}
