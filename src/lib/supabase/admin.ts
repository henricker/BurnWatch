import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only. Creates a Supabase client with the service_role key when
 * SUPABASE_SERVICE_ROLE_KEY is set. Use for signed URLs and admin operations.
 * Returns null if the key is not set (do not use in browser).
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Server-only. Creates a Supabase client with anon key and implicit flow.
 * Use only for signInWithOtp (e.g. invite emails). The magic link will then
 * redirect with tokens in the URL fragment (#access_token=...) instead of
 * ?code=..., so the invitee's browser can complete auth without a PKCE verifier.
 */
export function createSupabaseOtpClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for OTP client.",
    );
  }
  return createClient(url, key, {
    auth: {
      flowType: "implicit",
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
