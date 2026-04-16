import { redirect } from "next/navigation";

import type { Organization, Profile, Subscription } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SessionProfile {
  userId: string;
  email: string | null;
  profile: Profile;
  organization: Organization & { subscription: Subscription | null };
}

/**
 * Returns the current session user and optionally their first profile.
 * Redirects to /login when not authenticated. Does not redirect when user has no profile.
 * Use this on /onboarding to show the form only when user exists and profile does not.
 */
export async function getSessionOptionalProfile(): Promise<{
  user: { id: string; email: string | null };
  profile: (Profile & { organization: Organization }) | null;
}> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const profile = await prisma.profile.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });

  return {
    user: { id: user.id, email: user.email ?? null },
    profile,
  };
}

/**
 * Returns the current session user and their first organization profile.
 * Redirects to /login when not authenticated, and to /onboarding when no profile exists.
 */
export async function getSessionProfile(): Promise<SessionProfile> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const profile = await prisma.profile.findFirst({
    where: { userId: user.id },
    include: { organization: { include: { subscription: true } } },
  });

  if (!profile) {
    redirect("/onboarding");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    organization: profile.organization,
  };
}
