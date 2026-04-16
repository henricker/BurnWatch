import { describe, expect, it } from "vitest";

import { hasActiveSubscriptionAccess } from "./has-active-subscription-access";

describe("hasActiveSubscriptionAccess", () => {
  const now = new Date("2026-02-01T00:00:00.000Z");

  it("returns false when organization has no subscriptionId", () => {
    expect(
      hasActiveSubscriptionAccess(
        {
          subscriptionId: null,
          subscription: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it("returns false when subscription exists but dates are missing", () => {
    expect(
      hasActiveSubscriptionAccess(
        {
          subscriptionId: "sub-db-1",
          subscription: { cancelAt: null, currentPeriodEnd: null },
        },
        now,
      ),
    ).toBe(false);
  });

  it("returns true when current period end is in the future", () => {
    expect(
      hasActiveSubscriptionAccess(
        {
          subscriptionId: "sub-db-1",
          subscription: { cancelAt: null, currentPeriodEnd: new Date("2026-03-01T00:00:00.000Z") },
        },
        now,
      ),
    ).toBe(true);
  });

  it("returns false when period end is in the past", () => {
    expect(
      hasActiveSubscriptionAccess(
        {
          subscriptionId: "sub-db-1",
          subscription: { cancelAt: null, currentPeriodEnd: new Date("2026-01-01T00:00:00.000Z") },
        },
        now,
      ),
    ).toBe(false);
  });
});
