import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ManageSubscriptionUseCase } from "@/modules/subscriptions/application/use-cases/manage-subscription-usecase";
import { StripeProvider } from "@/modules/subscriptions/infrastructure/stripeProvider";
import { StripeProviderError } from "@/modules/subscriptions/domain/errors";

export const dynamic = "force-dynamic";

/**
 * Creates a Stripe Customer Portal session. The return_url is sent to Stripe so the portal
 * shows a "Return to your website" link; when the customer clicks it, they are sent back
 * to return_url. There is no automatic redirect after cancel/reactivate—they must click that link.
 * Optional: In Stripe Dashboard > Settings > Billing > Customer portal, set "Default Redirect link"
 * to your app URL (e.g. https://yourapp.com/dashboard/subscription) so the link is always visible.
 */

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const baseUrl =
    (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || origin).trim() || origin;
  const returnUrl = `${baseUrl}/dashboard/subscription`;
  if (!returnUrl.startsWith("http://") && !returnUrl.startsWith("https://")) {
    if (process.env.NODE_ENV !== "test") {
      console.error("[POST /api/stripe/portal] Invalid return_url (set NEXT_PUBLIC_APP_URL):", returnUrl);
    }
  }

  try {
    const stripeProvider = new StripeProvider();
    const useCase = new ManageSubscriptionUseCase(prisma, stripeProvider);
    const result = await useCase.execute({ userId: user.id, returnUrl });

    if (!result) {
      return NextResponse.json(
        { error: "No subscription found. Subscribe first to manage your plan." },
        { status: 404 },
      );
    }
    return NextResponse.json({ url: result.url });
  } catch (err) {
    if (err instanceof StripeProviderError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (process.env.NODE_ENV !== "test") {
      console.error("[POST /api/stripe/portal]", err);
    }
    return NextResponse.json({ error: "Portal failed" }, { status: 500 });
  }
}
