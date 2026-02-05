import { NextResponse } from "next/server";
import { isValidLocale } from "@/i18n/locales";

const COOKIE_NAME = "NEXT_LOCALE";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function setLocaleCookie(
  response: NextResponse,
  locale: string | null | undefined,
): void {
  const value = locale && isValidLocale(locale) ? locale : "en";
  response.cookies.set(COOKIE_NAME, value, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}
