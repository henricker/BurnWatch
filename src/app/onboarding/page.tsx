"use client";

import { OwnerOnboardingCard } from "@/components/owner-onboarding-card";

/**
 * Owner onboarding: user has no profile (first sign-up, not from an invite).
 * Same modal-style card as "Complete profile" for members, but with organization name.
 * Redirect to /onboarding is done by getSessionProfile() when profile is missing.
 */
export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <OwnerOnboardingCard />
    </div>
  );
}
