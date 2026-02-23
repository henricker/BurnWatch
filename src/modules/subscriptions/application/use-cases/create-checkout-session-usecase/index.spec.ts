import { describe, expect, it, vi } from "vitest";

import { StripeConfigError } from "../../../domain/errors";
import type { IStripeProvider } from "../../../domain/stripeProvider";
import { CreateCheckoutSessionUseCase } from "./index";

function createStripeProviderMock(): IStripeProvider {
  return {
    createCheckoutSession: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/session", sessionId: "cs_1" }),
    createCustomerPortalSession: vi.fn(),
    constructWebhookEvent: vi.fn(),
    retrieveSubscription: vi.fn(),
  };
}

const baseParams = {
  userId: "user-1",
  plan: "PRO" as const,
  market: "INTL" as const,
  customerEmail: "u@example.com",
  successUrl: "https://app.example.com/success",
  cancelUrl: "https://app.example.com/cancel",
};

describe("CreateCheckoutSessionUseCase", () => {
  it("throws StripeConfigError for unknown plan", async () => {
    const env = { STRIPE_PRICE_PRO_USD: "price_pro" };
    const stripe = createStripeProviderMock();
    const useCase = new CreateCheckoutSessionUseCase(stripe, env);

    await expect(
      useCase.execute({ ...baseParams, plan: "UNKNOWN" as "PRO" }),
    ).rejects.toThrow(StripeConfigError);

    expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("throws StripeConfigError for unknown market", async () => {
    const env = { STRIPE_PRICE_PRO_USD: "price_pro" };
    const stripe = createStripeProviderMock();
    const useCase = new CreateCheckoutSessionUseCase(stripe, env);

    await expect(
      useCase.execute({ ...baseParams, market: "XX" as "INTL" }),
    ).rejects.toThrow(StripeConfigError);

    expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("throws StripeConfigError when price env var is not set", async () => {
    const env = {};
    const stripe = createStripeProviderMock();
    const useCase = new CreateCheckoutSessionUseCase(stripe, env);

    await expect(useCase.execute(baseParams)).rejects.toThrow(StripeConfigError);

    expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("calls createCheckoutSession with trial 15 days for PRO when allowTrial is true", async () => {
    const env = { STRIPE_PRICE_PRO_USD: "price_pro_usd" };
    const stripe = createStripeProviderMock();
    const useCase = new CreateCheckoutSessionUseCase(stripe, env);

    await useCase.execute(baseParams);

    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        priceId: "price_pro_usd",
        customerEmail: baseParams.customerEmail,
        successUrl: baseParams.successUrl,
        cancelUrl: baseParams.cancelUrl,
        metadata: { userId: baseParams.userId, plan: "PRO" },
        trialPeriodDays: 15,
      }),
    );
  });

  it("calls createCheckoutSession with trial 30 days for STARTER when allowTrial is true", async () => {
    const env = { STRIPE_PRICE_STARTER_USD: "price_starter_usd" };
    const stripe = createStripeProviderMock();
    const useCase = new CreateCheckoutSessionUseCase(stripe, env);

    await useCase.execute({ ...baseParams, plan: "STARTER" });

    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        priceId: "price_starter_usd",
        trialPeriodDays: 30,
      }),
    );
  });

  it("calls createCheckoutSession with trial 0 when allowTrial is false", async () => {
    const env = { STRIPE_PRICE_PRO_USD: "price_pro_usd" };
    const stripe = createStripeProviderMock();
    const useCase = new CreateCheckoutSessionUseCase(stripe, env);

    await useCase.execute({ ...baseParams, allowTrial: false });

    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        trialPeriodDays: 0,
      }),
    );
  });

  it("returns url and sessionId from provider", async () => {
    const env = { STRIPE_PRICE_PRO_USD: "price_pro_usd" };
    const stripe = createStripeProviderMock();
    const useCase = new CreateCheckoutSessionUseCase(stripe, env);

    const result = await useCase.execute(baseParams);

    expect(result).toEqual({ url: "https://checkout.stripe.com/session", sessionId: "cs_1" });
  });
});
