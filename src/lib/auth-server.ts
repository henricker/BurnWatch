import { redirect } from "next/navigation";

import type { Organization, Profile } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SessionProfile {
  userId: string;
  email: string | null;
  profile: Profile;
  organization: Organization;
}

/**
 * Returns the current session user and their first organization profile.
 * Redirects to / if not authenticated, and to /onboarding if no profile exists.
 */
export async function getSessionProfile(): Promise<SessionProfile> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/");
  }

  const profile = await prisma.profile.findFirst({
    where: { userId: user.id },
    include: { organization: true },
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
