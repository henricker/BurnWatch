import Stripe from "stripe";

import type { IStripeProvider } from "../domain/stripeProvider";
import type { CreateCheckoutSessionInput } from "../domain/stripeProvider";
import { StripeConfigError, StripeProviderError } from "../domain/errors";

function getSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || typeof key !== "string" || !key.startsWith("sk_")) {
    throw new StripeConfigError("STRIPE_SECRET_KEY is missing or invalid");
  }
  return key;
}

export class StripeProvider implements IStripeProvider {
  private readonly stripe: Stripe;

  constructor(secretKey?: string) {
    const key = secretKey ?? getSecretKey();
    this.stripe = new Stripe(key, { apiVersion: "2026-01-28.clover" });
  }

  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ url: string; sessionId: string }> {
    const {
      priceId,
      customerEmail,
      successUrl,
      cancelUrl,
      metadata,
      trialPeriodDays = 30,
    } = input;

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: customerEmail,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId: metadata.userId, plan: metadata.plan },
        subscription_data:
          trialPeriodDays > 0 ? { trial_period_days: trialPeriodDays } : undefined,
      });

      const url = session.url;
      if (!url) {
        throw new StripeProviderError("Checkout session has no URL");
      }
      if (!session.id) {
        throw new StripeProviderError("Checkout session has no id");
      }
      return { url, sessionId: session.id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe checkout failed";
      throw new StripeProviderError(msg);
    }
  }

  async createCustomerPortalSession(stripeCustomerId: string, returnUrl: string): Promise<{ url: string }> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl,
      });
      if (!session.url) {
        throw new StripeProviderError("Portal session has no URL");
      }
      return { url: session.url };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe portal failed";
      throw new StripeProviderError(msg);
    }
  }

  constructWebhookEvent(body: string | Buffer, signature: string, webhookSecret: string): Stripe.Event {
    const rawBody = typeof body === "string" ? body : body.toString("utf8");
    return Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }
}
