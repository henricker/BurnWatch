import type { PrismaClient } from "@prisma/client";

import type { CreateCheckoutSessionParams, CreateCheckoutSessionResult } from "../../../domain/types";
import type { IStripeProvider } from "../../../domain/stripeProvider";
import { StripeConfigError } from "../../../domain/errors";

const PLAN_VARS: Record<string, Record<string, string>> = {
  STARTER: {
    BR: "STRIPE_PRICE_STARTER_BRL",
    INTL: "STRIPE_PRICE_STARTER_USD",
  },
  PRO: {
    BR: "STRIPE_PRICE_PRO_BRL",
    INTL: "STRIPE_PRICE_PRO_USD",
  },
};

function getPriceId(plan: string, market: string, env: NodeJS.ProcessEnv = process.env): string {
  const vars = PLAN_VARS[plan]?.[market];
  if (!vars) {
    throw new StripeConfigError(`Unknown plan or market: ${plan}, ${market}`);
  }
  const key = PLAN_VARS[plan][market];
  const priceId = env[key];
  if (!priceId || typeof priceId !== "string") {
    throw new StripeConfigError(`${key} is not set`);
  }
  return priceId;
}

export class CreateCheckoutSessionUseCase {
  constructor(
    private readonly stripeProvider: IStripeProvider,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  async execute(params: CreateCheckoutSessionParams): Promise<CreateCheckoutSessionResult> {
    const { userId, plan, market, customerEmail, successUrl, cancelUrl, allowTrial = true } = params;
    const priceId = getPriceId(plan, market, this.env);

    const trialPeriodDays = allowTrial ? (plan === "PRO" ? 15 : 30) : 0;
    const result = await this.stripeProvider.createCheckoutSession({
      priceId,
      customerEmail,
      successUrl,
      cancelUrl,
      metadata: { userId, plan },
      trialPeriodDays,
    });

    return result;
  }
}
