import type { PrismaClient, CloudProvider } from "@prisma/client";

export interface UpsertDailySpendInput {
  organizationId: string;
  cloudAccountId: string;
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
  const {
    organizationId,
    cloudAccountId,
    provider,
    serviceName,
    date,
    amountCents,
    currency,
  } = input;

  const delegate: DailySpendDelegate = prisma.dailySpend;

  return delegate.upsert({
    where: {
      daily_spend_org_provider_service_date_account_unique: {
        organizationId,
        cloudAccountId,
        provider,
        serviceName,
        date,
      },
    },
    create: {
      organizationId,
      cloudAccountId,
      provider,
      serviceName,
      date,
      amountCents,
      currency,
    },
    update: {
      amountCents,
      currency: currency ?? "USD",
    },
  });
}

type PrismaWithTransaction = Pick<PrismaClient, "dailySpend" | "$transaction">;

/**
 * Bulk upsert daily spend rows in a single transaction.
 * Use this to persist all rows for a given day (or batch) at once.
 */
export async function upsertDailySpendBulk(
  prisma: PrismaWithTransaction,
  inputs: UpsertDailySpendInput[],
): Promise<number> {
  if (inputs.length === 0) return 0;

  const delegate = prisma.dailySpend;
  await prisma.$transaction(
    inputs.map((input) => {
      const {
        organizationId,
        cloudAccountId,
        provider,
        serviceName,
        date,
        amountCents,
        currency,
      } = input;
      return delegate.upsert({
        where: {
          daily_spend_org_provider_service_date_account_unique: {
            organizationId,
            cloudAccountId,
            provider,
            serviceName,
            date,
          },
        },
        create: {
          organizationId,
          cloudAccountId,
          provider,
          serviceName,
          date,
          amountCents,
          currency: currency ?? "USD",
        },
        update: {
          amountCents,
          currency: currency ?? "USD",
        },
      });
    }),
  );
  return inputs.length;
}

