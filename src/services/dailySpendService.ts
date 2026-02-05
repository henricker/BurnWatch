import type { PrismaClient, CloudProvider } from "@prisma/client";

export interface UpsertDailySpendInput {
  organizationId: string;
  date: Date;
  provider: CloudProvider;
  serviceName: string;
  amountCents: number;
  currency?: string;
}

type DailySpendDelegate = PrismaClient["dailySpend"];

export async function upsertDailySpend(
  prisma: Pick<PrismaClient, "dailySpend">,
  input: UpsertDailySpendInput,
) {
  const { organizationId, provider, serviceName, date, amountCents, currency } =
    input;

  const delegate: DailySpendDelegate = prisma.dailySpend;

  return delegate.upsert({
    where: {
      daily_spend_org_provider_service_date_unique: {
        organizationId,
        provider,
        serviceName,
        date,
      },
    },
    create: {
      organizationId,
      provider,
      serviceName,
      date,
      amountCents,
      currency,
    },
    update: {
      amountCents,
      currency,
    },
  });
}

