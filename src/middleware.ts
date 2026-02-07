import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { getPreferredLocaleFromHeader, LOCALES } from "@/i18n/locales";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // 1) Locale detection: set NEXT_LOCALE from Accept-Language if not already in cookie
  const existingLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (!existingLocale || !LOCALES.includes(existingLocale as (typeof LOCALES)[number])) {
    const preferred = getPreferredLocaleFromHeader(request.headers.get("accept-language"));
    response.cookies.set("NEXT_LOCALE", preferred, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  // 2) Market for pricing: BR (Reais) vs INTL (Dollars) from Vercel geo header or fallback
  const country = request.headers.get("x-vercel-ip-country") ?? "US";
  const market = country === "BR" ? "BR" : "INTL";
  response.cookies.set("bw_market", market, {
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  });

  // 3) Auth: redirect logged-in users from /login to dashboard
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if ((url && key) && request.nextUrl.pathname === "/login") {
    const AUTH_CHECK_TIMEOUT_MS = 4000;
    try {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      });
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), AUTH_CHECK_TIMEOUT_MS),
      );
      const { data: { user } } = await Promise.race([userPromise, timeoutPromise]);
      if (user) {
        const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
        const locale = request.cookies.get("NEXT_LOCALE")?.value ?? getPreferredLocaleFromHeader(request.headers.get("accept-language"));
        if (LOCALES.includes(locale as (typeof LOCALES)[number])) {
          redirect.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
        }
        redirect.cookies.set("bw_market", market, { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax" });
        return redirect;
      }
    } catch {
      // Supabase/network error: let the request through
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
