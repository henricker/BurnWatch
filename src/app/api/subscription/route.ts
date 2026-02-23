import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GetProfileByUserIdUseCase } from "@/modules/organizations/application/use-cases/get-profile-by-user-id-usecase";

export const dynamic = "force-dynamic";

export interface SubscriptionResponse {
  plan: "STARTER" | "PRO";
  status: string;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  hasPortal: boolean;
}

/**
 * GET /api/subscription
 * Returns subscription info for the current user's organization (for My subscription page).
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileUseCase = new GetProfileByUserIdUseCase(prisma);
  const profile = await profileUseCase.execute(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const orgWithSubscription = await prisma.organization.findUnique({
    where: { id: profile.organizationId },
    include: { subscription: true },
  });

  const subscription = orgWithSubscription?.subscription;
  const plan = subscription?.plan ?? "STARTER";
  const status = subscription?.status ?? "active";
  const currentPeriodEnd = subscription?.currentPeriodEnd?.toISOString() ?? null;
  const cancelAt = subscription?.cancelAt?.toISOString() ?? null;
  const hasPortal = Boolean(subscription?.stripeCustomerId);

  const body: SubscriptionResponse = {
    plan,
    status,
    currentPeriodEnd,
    cancelAt,
    hasPortal,
  };

  return NextResponse.json(body);
}
