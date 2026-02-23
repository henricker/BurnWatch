import type { PrismaClient } from "@prisma/client";

import type { ManageSubscriptionParams, ManageSubscriptionResult } from "../../../domain/types";
import type { IStripeProvider } from "../../../domain/stripeProvider";
import { StripeConfigError } from "../../../domain/errors";

export class ManageSubscriptionUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly stripeProvider: IStripeProvider,
  ) {}

  async execute(params: ManageSubscriptionParams): Promise<ManageSubscriptionResult | null> {
    const { userId, returnUrl } = params;

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      return null;
    }

    const { url } = await this.stripeProvider.createCustomerPortalSession(
      subscription.stripeCustomerId,
      returnUrl,
    );
    return { url };
  }
}
