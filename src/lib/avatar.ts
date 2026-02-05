const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

const PROFILE_BUCKET = "profile";

/**
 * Public URL for a profile avatar stored in the "profile" bucket.
 * Only works when the bucket is set to **public** in Supabase Storage.
 * Returns null if avatarPath is null/empty.
 */
export function getProfileAvatarUrl(avatarPath: string | null): string | null {
  if (!avatarPath?.trim()) return null;
  if (!SUPABASE_URL) return null;
  const base = SUPABASE_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${PROFILE_BUCKET}/${avatarPath.trim()}`;
}

/**
 * Server-only. Returns a signed URL for the avatar (works with private buckets).
 * Call from Server Components. When SUPABASE_SERVICE_ROLE_KEY is set, returns
 * a URL valid for 1 hour. Otherwise returns null (use getProfileAvatarUrl and
 * make the bucket public).
 */
export async function getProfileAvatarSignedUrl(
  avatarPath: string | null,
): Promise<string | null> {
  if (!avatarPath?.trim()) return null;
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.storage
    .from(PROFILE_BUCKET)
    .createSignedUrl(avatarPath.trim(), 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Initials from first and last name (e.g. "Olivia Chen" → "OC").
 * Falls back to first two chars of a single string, or "?".
 */
export function getInitials(firstName: string | null, lastName: string | null): string {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  if (first && last) {
    return (first[0] + last[0]).toUpperCase();
  }
  const combined = (first || last || "?").trim();
  if (combined.length >= 2) return combined.slice(0, 2).toUpperCase();
  return combined ? combined[0].toUpperCase() : "?";
}
