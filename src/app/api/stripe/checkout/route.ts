import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GetProfileByUserIdUseCase } from "@/modules/organizations/application/use-cases/get-profile-by-user-id-usecase";
import { CreateCheckoutSessionUseCase } from "@/modules/subscriptions/application/use-cases/create-checkout-session-usecase";
import { StripeProvider } from "@/modules/subscriptions/infrastructure/stripeProvider";
import type { MarketSlug, PlanSlug } from "@/modules/subscriptions/domain/types";
import { StripeConfigError, StripeProviderError } from "@/modules/subscriptions/domain/errors";

export const dynamic = "force-dynamic";

const PLANS: PlanSlug[] = ["STARTER", "PRO"];
const MARKETS: MarketSlug[] = ["BR", "INTL"];

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { plan?: string; allowTrial?: boolean };
  try {
    body = (await request.json()) as { plan?: string; allowTrial?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plan = (body.plan ?? "PRO") as PlanSlug;
  if (!PLANS.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan. Use STARTER or PRO." }, { status: 400 });
  }
  const allowTrial = body.allowTrial !== false;

  const profileUseCase = new GetProfileByUserIdUseCase(prisma);
  const profile = await profileUseCase.execute(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const marketCookie = cookieStore.get("burnwatch_market")?.value;
  const market: MarketSlug =
    marketCookie && MARKETS.includes(marketCookie as MarketSlug)
      ? (marketCookie as MarketSlug)
      : "INTL";

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
  const successUrl = `${baseUrl}/dashboard/subscription?success=1`;
  const cancelUrl = `${baseUrl}/dashboard/subscription?canceled=1`;

  const customerEmail = user.email ?? "";
  if (!customerEmail) {
    return NextResponse.json(
      { error: "User email is required for checkout" },
      { status: 400 },
    );
  }

  try {
    const stripeProvider = new StripeProvider();
    const useCase = new CreateCheckoutSessionUseCase(stripeProvider);
    const result = await useCase.execute({
      userId: user.id,
      plan,
      market,
      customerEmail,
      successUrl,
      cancelUrl,
      allowTrial,
    });
    return NextResponse.json({ url: result.url, sessionId: result.sessionId });
  } catch (err) {
    if (err instanceof StripeConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof StripeProviderError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (process.env.NODE_ENV !== "test") {
      console.error("[POST /api/stripe/checkout]", err);
    }
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
