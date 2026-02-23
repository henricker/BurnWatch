import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { IStripeProvider } from "../../../domain/stripeProvider";
import { HandleStripeWebhookUseCase } from "./index";

function createStripeProviderMock(overrides?: Partial<IStripeProvider>): IStripeProvider {
  return {
    createCheckoutSession: vi.fn(),
    createCustomerPortalSession: vi.fn(),
    constructWebhookEvent: vi.fn(),
    retrieveSubscription: vi.fn().mockResolvedValue({
      status: "active",
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
      items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 }] },
    }),
    ...overrides,
  };
}

describe("HandleStripeWebhookUseCase", () => {
  it("ignores unhandled event types", async () => {
    const prisma = {
      subscription: { upsert: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      organization: { updateMany: vi.fn() },
    } as unknown as PrismaClient;
    const stripe = createStripeProviderMock();

    const useCase = new HandleStripeWebhookUseCase(prisma, stripe);
    const event = {
      id: "evt_1",
      type: "invoice.paid",
      data: { object: {} },
    } as unknown as import("stripe").Stripe.Event;

    await useCase.execute(event);

    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
  });

  it("returns early on checkout.session.completed when metadata.userId is missing", async () => {
    const prisma = {
      subscription: { upsert: vi.fn(), updateMany: vi.fn() },
      organization: { updateMany: vi.fn() },
    } as unknown as PrismaClient;
    const stripe = createStripeProviderMock();

    const useCase = new HandleStripeWebhookUseCase(prisma, stripe);
    const event = {
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { plan: "PRO" },
          customer: "cus_1",
          subscription: "sub_1",
        },
      },
    } as unknown as import("stripe").Stripe.Event;

    await useCase.execute(event);

    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it("returns early on checkout.session.completed when customer is missing", async () => {
    const prisma = {
      subscription: { upsert: vi.fn(), updateMany: vi.fn() },
      organization: { updateMany: vi.fn() },
    } as unknown as PrismaClient;
    const stripe = createStripeProviderMock();

    const useCase = new HandleStripeWebhookUseCase(prisma, stripe);
    const event = {
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { userId: "user-1", plan: "PRO" },
          customer: null,
          subscription: "sub_1",
        },
      },
    } as unknown as import("stripe").Stripe.Event;

    await useCase.execute(event);

    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it("upserts subscription and links only owned orgs on checkout.session.completed", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "sub-db-1",
      userId: "user-1",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      status: "active",
      plan: "PRO",
      currentPeriodEnd: new Date(),
    });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      subscription: { upsert, updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      organization: { updateMany },
    } as unknown as PrismaClient;
    const stripe = createStripeProviderMock();

    const useCase = new HandleStripeWebhookUseCase(prisma, stripe);
    const event = {
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { userId: "user-1", plan: "PRO" },
          customer: "cus_1",
          subscription: "sub_1",
        },
      },
    } as unknown as import("stripe").Stripe.Event;

    await useCase.execute(event);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        create: expect.objectContaining({
          userId: "user-1",
          stripeCustomerId: "cus_1",
          stripeSubscriptionId: "sub_1",
          status: "active",
          plan: "PRO",
        }),
        update: expect.objectContaining({
          stripeCustomerId: "cus_1",
          stripeSubscriptionId: "sub_1",
          status: "active",
          plan: "PRO",
        }),
      }),
    );
    expect(updateMany).toHaveBeenCalledWith({
      where: { profiles: { some: { userId: "user-1", role: "OWNER" } } },
      data: { subscriptionId: "sub-db-1" },
    });
  });

  it("updates subscription and sets cancelAt on customer.subscription.updated", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      subscription: { upsert: vi.fn(), updateMany, findUnique: vi.fn(), update: vi.fn() },
      organization: { updateMany: vi.fn() },
    } as unknown as PrismaClient;
    const stripe = createStripeProviderMock();

    const useCase = new HandleStripeWebhookUseCase(prisma, stripe);
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
    const cancelAt = periodEnd;
    const event = {
      id: "evt_1",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_stripe_1",
          status: "trialing",
          current_period_end: periodEnd,
          cancel_at: cancelAt,
          cancel_at_period_end: false,
          items: { data: [{ current_period_end: periodEnd }] },
        },
      },
    } as unknown as import("stripe").Stripe.Event;

    await useCase.execute(event);

    expect(updateMany).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: "sub_stripe_1" },
      data: expect.objectContaining({
        status: "active",
        currentPeriodEnd: expect.any(Date),
        cancelAt: expect.any(Date),
      }),
    });
  });

  it("updates subscription and unlinks orgs on customer.subscription.deleted", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "sub-db-1" });
    const subUpdate = vi.fn().mockResolvedValue(undefined);
    const orgUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      subscription: {
        upsert: vi.fn(),
        updateMany: vi.fn(),
        findUnique,
        update: subUpdate,
      },
      organization: { updateMany: orgUpdateMany },
    } as unknown as PrismaClient;
    const stripe = createStripeProviderMock();

    const useCase = new HandleStripeWebhookUseCase(prisma, stripe);
    const event = {
      id: "evt_1",
      type: "customer.subscription.deleted",
      data: {
        object: { id: "sub_stripe_1" },
      },
    } as unknown as import("stripe").Stripe.Event;

    await useCase.execute(event);

    expect(findUnique).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: "sub_stripe_1" },
      select: { id: true },
    });
    expect(subUpdate).toHaveBeenCalledWith({
      where: { id: "sub-db-1" },
      data: { status: "canceled", currentPeriodEnd: null, cancelAt: null },
    });
    expect(orgUpdateMany).toHaveBeenCalledWith({
      where: { subscriptionId: "sub-db-1" },
      data: { subscriptionId: null },
    });
  });

  it("does not throw when customer.subscription.deleted for unknown subscriptionId", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const prisma = {
      subscription: { upsert: vi.fn(), updateMany: vi.fn(), findUnique, update: vi.fn() },
      organization: { updateMany: vi.fn() },
    } as unknown as PrismaClient;
    const stripe = createStripeProviderMock();

    const useCase = new HandleStripeWebhookUseCase(prisma, stripe);
    const event = {
      id: "evt_1",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_unknown" } },
    } as unknown as import("stripe").Stripe.Event;

    await expect(useCase.execute(event)).resolves.toBeUndefined();
    expect(prisma.organization.updateMany).not.toHaveBeenCalled();
  });
});
