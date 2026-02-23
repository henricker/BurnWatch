import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { StripeProvider } from "@/modules/subscriptions/infrastructure/stripeProvider";
import { HandleStripeWebhookUseCase } from "@/modules/subscriptions/application/use-cases/handle-stripe-webhook-usecase";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook endpoint. Body must be consumed as raw text for signature verification.
 * In Next.js App Router we do not use bodyParser; we read request.text() and pass it to constructEvent.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || typeof webhookSecret !== "string") {
    if (process.env.NODE_ENV !== "test") {
      console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set");
    }
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: import("stripe").Stripe.Event;
  try {
    const stripeProvider = new StripeProvider();
    event = stripeProvider.constructWebhookEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    if (process.env.NODE_ENV !== "test") {
      console.error("[Stripe Webhook] constructEvent error:", message);
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const handleWebhook = new HandleStripeWebhookUseCase(prisma, new StripeProvider());
    await handleWebhook.execute(event);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.error("[Stripe Webhook] handle error:", err);
    }
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
