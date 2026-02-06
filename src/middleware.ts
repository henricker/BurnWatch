import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return response;
  }

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
    const {
      data: { user },
    } = await Promise.race([userPromise, timeoutPromise]);

    // Logged-in users visiting the login page go to dashboard
    if (request.nextUrl.pathname === "/login" && user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch {
    // Supabase/network error: let the request through so the app still loads
  }

  return response;
}

export const config = {
  matcher: ["/login"],
};
