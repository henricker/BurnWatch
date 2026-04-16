import type Stripe from "stripe";

export interface CreateCheckoutSessionInput {
  priceId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: { userId: string; plan: string };
  trialPeriodDays?: number;
}

export interface IStripeProvider {
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ url: string; sessionId: string }>;
  createCustomerPortalSession(stripeCustomerId: string, returnUrl: string): Promise<{ url: string }>;
  constructWebhookEvent(body: string | Buffer, signature: string, webhookSecret: string): Stripe.Event;
  retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
}
