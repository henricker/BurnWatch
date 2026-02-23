import { beforeEach, describe, expect, it, vi } from "vitest";

import { StripeConfigError, StripeProviderError } from "../domain/errors";
import { StripeProvider } from "./stripeProvider";

const {
  mockCheckoutCreate,
  mockPortalCreate,
  mockSubscriptionsRetrieve,
  mockConstructEvent,
} = vi.hoisted(() => ({
  mockCheckoutCreate: vi.fn(),
  mockPortalCreate: vi.fn(),
  mockSubscriptionsRetrieve: vi.fn(),
  mockConstructEvent: vi.fn(),
}));

vi.mock("stripe", () => {
  class StripeMock {
    static webhooks = { constructEvent: mockConstructEvent };
    constructor(_key?: string, _opts?: unknown) {
      return {
        checkout: { sessions: { create: mockCheckoutCreate } },
        billingPortal: { sessions: { create: mockPortalCreate } },
        subscriptions: { retrieve: mockSubscriptionsRetrieve },
      };
    }
  }
  return { default: StripeMock };
});

describe("StripeProvider", () => {
  const validKey = "sk_test_123456789";

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session",
      id: "cs_1",
    });
    mockPortalCreate.mockResolvedValue({
      url: "https://billing.stripe.com/portal",
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      id: "sub_1",
      status: "active",
      current_period_end: Math.floor(Date.now() / 1000) + 86400,
      items: { data: [] },
    });
    mockConstructEvent.mockReturnValue({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } });
  });

  it("throws StripeConfigError when no secret key is passed and env STRIPE_SECRET_KEY is unset", async () => {
    const orig = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      expect(() => new StripeProvider()).toThrow(StripeConfigError);
    } finally {
      if (orig !== undefined) process.env.STRIPE_SECRET_KEY = orig;
    }
  });

  it("createCheckoutSession returns url and sessionId", async () => {
    const provider = new StripeProvider(validKey);
    const result = await provider.createCheckoutSession({
      priceId: "price_1",
      customerEmail: "u@example.com",
      successUrl: "https://app.example.com/success",
      cancelUrl: "https://app.example.com/cancel",
      metadata: { userId: "user-1", plan: "PRO" },
      trialPeriodDays: 15,
    });

    expect(result).toEqual({ url: "https://checkout.stripe.com/session", sessionId: "cs_1" });
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer_email: "u@example.com",
        line_items: [{ price: "price_1", quantity: 1 }],
        success_url: "https://app.example.com/success",
        cancel_url: "https://app.example.com/cancel",
        metadata: { userId: "user-1", plan: "PRO" },
        subscription_data: { trial_period_days: 15 },
      }),
    );
  });

  it("createCheckoutSession omits subscription_data when trialPeriodDays is 0", async () => {
    const provider = new StripeProvider(validKey);
    await provider.createCheckoutSession({
      priceId: "price_1",
      customerEmail: "u@example.com",
      successUrl: "https://app.example.com/success",
      cancelUrl: "https://app.example.com/cancel",
      metadata: { userId: "user-1", plan: "PRO" },
      trialPeriodDays: 0,
    });

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: undefined,
      }),
    );
  });

  it("createCheckoutSession throws StripeProviderError when session has no url", async () => {
    mockCheckoutCreate.mockResolvedValueOnce({ id: "cs_1", url: null });
    const provider = new StripeProvider(validKey);

    await expect(
      provider.createCheckoutSession({
        priceId: "price_1",
        customerEmail: "u@example.com",
        successUrl: "https://app.example.com/success",
        cancelUrl: "https://app.example.com/cancel",
        metadata: { userId: "user-1", plan: "PRO" },
      }),
    ).rejects.toThrow(StripeProviderError);
  });

  it("createCustomerPortalSession returns url", async () => {
    const provider = new StripeProvider(validKey);
    const result = await provider.createCustomerPortalSession("cus_1", "https://app.example.com/return");

    expect(result).toEqual({ url: "https://billing.stripe.com/portal" });
    expect(mockPortalCreate).toHaveBeenCalledWith({
      customer: "cus_1",
      return_url: "https://app.example.com/return",
    });
  });

  it("createCustomerPortalSession throws StripeProviderError when session has no url", async () => {
    mockPortalCreate.mockResolvedValueOnce({ url: null });
    const provider = new StripeProvider(validKey);

    await expect(
      provider.createCustomerPortalSession("cus_1", "https://app.example.com/return"),
    ).rejects.toThrow(StripeProviderError);
  });

  it("retrieveSubscription returns subscription from Stripe", async () => {
    const provider = new StripeProvider(validKey);
    const sub = await provider.retrieveSubscription("sub_1");

    expect(sub).toMatchObject({ id: "sub_1", status: "active" });
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith("sub_1");
  });

  it("constructWebhookEvent returns event from Stripe.webhooks.constructEvent", () => {
    const provider = new StripeProvider(validKey);
    const payload = '{"id":"evt_1"}';
    const sig = "stripe-signature";
    const secret = "whsec_1";

    const event = provider.constructWebhookEvent(payload, sig, secret);

    expect(event).toEqual({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } });
    expect(mockConstructEvent).toHaveBeenCalledWith(payload, sig, secret);
  });
});
