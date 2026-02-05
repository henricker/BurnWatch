export const LOCALES = ["pt", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export function isValidLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}
