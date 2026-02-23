import type { PrismaClient } from "@prisma/client";
import type { PlanType } from "@prisma/client";
import type Stripe from "stripe";

import type { IStripeProvider } from "../../../domain/stripeProvider";

const PLAN_MAP: Record<string, PlanType> = {
  STARTER: "STARTER",
  PRO: "PRO",
};

function toPlan(plan: string | undefined): PlanType {
  if (plan && PLAN_MAP[plan]) return PLAN_MAP[plan];
  return "STARTER";
}

function subscriptionStatus(stripeStatus: string): string {
  const s = stripeStatus?.toLowerCase();
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  if (s === "canceled" || s === "incomplete_expired") return "canceled";
  return s ?? "active";
}

export class HandleStripeWebhookUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly stripeProvider: IStripeProvider,
  ) {}

  async execute(event: Stripe.Event): Promise<void> {
    const logPrefix = `[Stripe Webhook ${event.id}]`;

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(event, logPrefix);
          break;
        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(event, logPrefix);
          break;
        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(event, logPrefix);
          break;
        default:
          if (process.env.NODE_ENV !== "test") {
            console.log(`${logPrefix} Unhandled event type: ${event.type}`);
          }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.error(`${logPrefix} Error:`, err);
      }
      throw err;
    }
  }

  private async handleCheckoutCompleted(event: Stripe.Event, logPrefix: string): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = (session.metadata as { userId?: string } | null)?.userId;
    const planSlug = (session.metadata as { plan?: string } | null)?.plan;

    if (!userId) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(`${logPrefix} checkout.session.completed missing metadata.userId`);
      }
      return;
    }

    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    if (!customerId) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(`${logPrefix} checkout.session.completed missing customer`);
      }
      return;
    }

    let status = "active";
    let currentPeriodEnd: Date | null = null;

    if (subscriptionId) {
      try {
        const sub = await this.stripeProvider.retrieveSubscription(subscriptionId);
        status = subscriptionStatus(sub.status ?? "active");
        const periodEnd =
          (sub as { current_period_end?: number }).current_period_end ??
          sub.items?.data?.[0]?.current_period_end;
        if (periodEnd) {
          currentPeriodEnd = new Date(periodEnd * 1000);
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "test") {
          console.warn(`${logPrefix} Could not retrieve subscription:`, e);
        }
      }
    }

    const plan = toPlan(planSlug);

    const sub = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status,
        plan,
        currentPeriodEnd,
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status,
        plan,
        currentPeriodEnd,
      },
    });

    await this.prisma.organization.updateMany({
      where: { profiles: { some: { userId, role: "OWNER" } } },
      data: { subscriptionId: sub.id },
    });

    if (process.env.NODE_ENV !== "test") {
      console.log(`${logPrefix} checkout.session.completed processed for userId=${userId}`);
    }
  }

  private async handleSubscriptionUpdated(event: Stripe.Event, logPrefix: string): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const subscriptionId = subscription.id;
    const status = subscriptionStatus(subscription.status ?? "active");
    const periodEnd =
      (subscription as { current_period_end?: number }).current_period_end ??
      subscription.items?.data?.[0]?.current_period_end;
    const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : null;

    const cancelAtStripe = (subscription as { cancel_at?: number }).cancel_at;
    const cancelAtPeriodEnd = (subscription as { cancel_at_period_end?: boolean }).cancel_at_period_end;
    const cancelAt: Date | null = cancelAtStripe
      ? new Date(cancelAtStripe * 1000)
      : cancelAtPeriodEnd && periodEnd
        ? new Date(periodEnd * 1000)
        : null;

    const updated = await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status, currentPeriodEnd, cancelAt },
    });

    if (process.env.NODE_ENV !== "test") {
      console.log(
        `${logPrefix} customer.subscription.updated subscriptionId=${subscriptionId} updated=${updated.count} cancelAt=${cancelAt?.toISOString() ?? "null"}`,
      );
    }
  }

  private async handleSubscriptionDeleted(event: Stripe.Event, logPrefix: string): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const subscriptionId = subscription.id;

    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true },
    });
    if (sub) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "canceled", currentPeriodEnd: null, cancelAt: null },
      });
      const unlinked = await this.prisma.organization.updateMany({
        where: { subscriptionId: sub.id },
        data: { subscriptionId: null },
      });
      if (process.env.NODE_ENV !== "test") {
        console.log(
          `${logPrefix} customer.subscription.deleted subscriptionId=${subscriptionId} orgsUnlinked=${unlinked.count}`,
        );
      }
    } else if (process.env.NODE_ENV !== "test") {
      console.warn(`${logPrefix} customer.subscription.deleted unknown subscriptionId=${subscriptionId}`);
    }
  }
}
