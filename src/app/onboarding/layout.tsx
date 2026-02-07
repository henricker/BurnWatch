import { redirect } from "next/navigation";

import { getSessionOptionalProfile } from "@/lib/auth-server";

/**
 * Onboarding is for authenticated users without a profile (first-time owner).
 * If they already have a profile, send them to the dashboard.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getSessionOptionalProfile();

  if (profile) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
