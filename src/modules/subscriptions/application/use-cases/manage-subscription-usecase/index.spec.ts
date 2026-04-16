import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { IStripeProvider } from "../../../domain/stripeProvider";
import { ManageSubscriptionUseCase } from "./index";

function createStripeProviderMock(): IStripeProvider {
  return {
    createCheckoutSession: vi.fn(),
    createCustomerPortalSession: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/session" }),
    constructWebhookEvent: vi.fn(),
    retrieveSubscription: vi.fn(),
  };
}

describe("ManageSubscriptionUseCase", () => {
  it("returns null when user has no subscription", async () => {
    const prisma = {
      subscription: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;
    const stripe = createStripeProviderMock();

    const useCase = new ManageSubscriptionUseCase(prisma, stripe);
    const result = await useCase.execute({ userId: "user-1", returnUrl: "https://app.example.com/subscription" });

    expect(result).toBeNull();
    expect(stripe.createCustomerPortalSession).not.toHaveBeenCalled();
  });

  it("returns null when subscription has no stripeCustomerId", async () => {
    const prisma = {
      subscription: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sub-1",
          userId: "user-1",
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        }),
      },
    } as unknown as PrismaClient;
    const stripe = createStripeProviderMock();

    const useCase = new ManageSubscriptionUseCase(prisma, stripe);
    const result = await useCase.execute({ userId: "user-1", returnUrl: "https://app.example.com/sub" });

    expect(result).toBeNull();
    expect(stripe.createCustomerPortalSession).not.toHaveBeenCalled();
  });

  it("returns portal url when user has subscription with stripeCustomerId", async () => {
    const prisma = {
      subscription: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sub-1",
          userId: "user-1",
          stripeCustomerId: "cus_abc",
          stripeSubscriptionId: "sub_xyz",
        }),
      },
    } as unknown as PrismaClient;
    const stripe = createStripeProviderMock();

    const useCase = new ManageSubscriptionUseCase(prisma, stripe);
    const returnUrl = "https://app.example.com/dashboard/subscription";
    const result = await useCase.execute({ userId: "user-1", returnUrl });

    expect(result).toEqual({ url: "https://billing.stripe.com/session" });
    expect(stripe.createCustomerPortalSession).toHaveBeenCalledWith("cus_abc", returnUrl);
  });
});
