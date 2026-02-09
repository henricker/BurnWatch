import type { CloudAccount } from "@prisma/client";
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type GetCostAndUsageCommandInput,
} from "@aws-sdk/client-cost-explorer";

import { EncryptionService } from "@/lib/security/encryption";

import type {
  DailySpendData,
  FetchRange,
  ICloudProvider,
} from "../../domain/cloudProvider";
import {
  SyncErrorWithKey,
  SYNC_ERROR_AWS_INVALID_CREDENTIALS,
} from "../../domain/cloudProvider";

interface AwsCredentialsPayload {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
}

function parseAwsDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map((x) => Number(x));
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function amountToCents(amount: string | undefined | null): number {
  if (!amount) return 0;
  const asNumber = Number(amount);
  if (!Number.isFinite(asNumber)) return 0;
  return Math.round(asNumber * 100);
}

/**
 * Gera um valor aleatório em torno de uma média, com desvio padrão pequeno.
 * Semelhante ao usado no fake da Vercel: aproximação de normal com 12 amostras.
 */
function randomAroundMean(mean: number, stdDevRatio: number = 0.12): number {
  if (mean <= 0) return 0;
  const stdDev = mean * stdDevRatio;
  let z = 0;
  for (let i = 0; i < 12; i++) z += Math.random();
  z = (z - 6) * stdDev;
  const value = Math.max(0, mean + z);
  return Math.round(value * 100) / 100;
}

/**
 * Fake AWS Cost Explorer data for local/dev usage.
 * Mirrors what `fetchDailySpend` would return after normalização.
 */
export function fakeAwsBilledResponse(range: FetchRange): DailySpendData[] {
  const date = parseAwsDate(range.from);
  const ec2 = randomAroundMean(150);
  const rds = randomAroundMean(80);
  const s3 = randomAroundMean(32);
  const lambda = randomAroundMean(12);
  return [
    {
      date,
      serviceName: "Amazon Elastic Compute Cloud",
      amountCents: Math.round(ec2 * 100),
      currency: "USD",
    },
    {
      date,
      serviceName: "Amazon Relational Database Service",
      amountCents: Math.round(rds * 100),
      currency: "USD",
    },
    {
      date,
      serviceName: "Amazon Simple Storage Service",
      amountCents: Math.round(s3 * 100),
      currency: "USD",
    },
    {
      date,
      serviceName: "AWS Lambda",
      amountCents: Math.round(lambda * 100),
      currency: "USD",
    },
  ];
}

export class AwsProvider implements ICloudProvider {
  constructor(private readonly encryption: EncryptionService) {}

  private getCredentials(cloudAccount: CloudAccount): AwsCredentialsPayload {
    const plaintext = this.encryption.decrypt(cloudAccount.encryptedCredentials);
    const payload = JSON.parse(plaintext) as AwsCredentialsPayload;
    const accessKeyId = payload.accessKeyId;
    const secretAccessKey = payload.secretAccessKey;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("AWS credentials: missing accessKeyId or secretAccessKey");
    }

    return payload;
  }

  async fetchDailySpend(
    cloudAccount: CloudAccount,
    range: FetchRange,
  ): Promise<DailySpendData[]> {
    if (process.env.USE_FAKE_AWS_BILLING === "true") {
      return fakeAwsBilledResponse(range);
    }

    const creds = this.getCredentials(cloudAccount);

    const input: GetCostAndUsageCommandInput = {
      TimePeriod: {
        Start: range.from,
        End: range.to,
      },
      Granularity: "DAILY",
      Metrics: ["UnblendedCost"],
      GroupBy: [
        {
          Type: "DIMENSION",
          Key: "SERVICE",
        },
      ],
    };

    try {
      const client = new CostExplorerClient({
        region: creds.region || "us-east-1",
        credentials: {
          accessKeyId: creds.accessKeyId as string,
          secretAccessKey: creds.secretAccessKey as string,
        },
      });

      const command = new GetCostAndUsageCommand(input);
      const response = await client.send(command);

      const results: DailySpendData[] = [];

      if (!response.ResultsByTime) {
        return results;
      }

      for (const byTime of response.ResultsByTime) {
        const dateStr = byTime.TimePeriod?.Start ?? byTime.TimePeriod?.End;
        if (!dateStr) continue;
        const date = parseAwsDate(dateStr);

        const groups = byTime.Groups ?? [];
        for (const group of groups) {
          const serviceName = group.Keys?.[0] ?? "AWS";
          const metric = group.Metrics?.UnblendedCost;
          const amount = amountToCents(metric?.Amount);
          if (amount === 0) continue;

          results.push({
            date,
            serviceName,
            amountCents: amount,
            currency: metric?.Unit ?? "USD",
          });
        }
      }

      return results;
    } catch (err) {
      const anyErr = err as { name?: string; message?: string };
      const code = anyErr?.name ?? "";

      if (
        /UnrecognizedClientException|InvalidClientTokenId|InvalidSignatureException|AccessDeniedException/i.test(
          code,
        ) ||
        (anyErr?.message &&
          /invalid.*signature|not authorized|access denied|invalid client/i.test(
            anyErr.message,
          ))
      ) {
        throw new SyncErrorWithKey(
          anyErr?.message ?? "AWS credentials invalid or not authorized",
          SYNC_ERROR_AWS_INVALID_CREDENTIALS,
        );
      }

      throw err;
    }
  }
}

