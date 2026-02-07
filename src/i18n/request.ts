import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

import { getPreferredLocaleFromHeader, isValidLocale, type Locale } from "./locales";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("NEXT_LOCALE")?.value ?? "";

  let locale: Locale;
  if (isValidLocale(raw)) {
    locale = raw;
  } else {
    const headerList = await headers();
    locale = getPreferredLocaleFromHeader(headerList.get("accept-language"));
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
