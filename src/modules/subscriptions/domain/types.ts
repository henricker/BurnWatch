import type { PlanType } from "@prisma/client";

export type PlanSlug = "STARTER" | "PRO";
export type MarketSlug = "BR" | "INTL";

export interface CreateCheckoutSessionParams {
  userId: string;
  plan: PlanSlug;
  market: MarketSlug;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  /** When false, checkout has no free trial (e.g. re-subscribe after expired trial). */
  allowTrial?: boolean;
}

export interface CreateCheckoutSessionResult {
  url: string;
  sessionId: string;
}

export interface ManageSubscriptionParams {
  userId: string;
  returnUrl: string;
}

export interface ManageSubscriptionResult {
  url: string;
}

export interface SubscriptionInfo {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: string;
  plan: PlanType;
  currentPeriodEnd: Date | null;
}
