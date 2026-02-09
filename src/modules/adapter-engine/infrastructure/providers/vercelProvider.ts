import type { CloudAccount } from "@prisma/client";

import { EncryptionService } from "@/lib/security/encryption";

import type {
  DailySpendData,
  FetchRange,
  ICloudProvider,
} from "../../domain/cloudProvider";
import {
  SyncErrorWithKey,
  SYNC_ERROR_VERCEL_FORBIDDEN,
} from "../../domain/cloudProvider";
import { randomAroundMean } from "./util/randomAroundMean";

const VERCEL_BILLING_URL = "https://api.vercel.com/v1/billing/charges";

/** Format as YYYY-MM-DDT00:00:00.000Z for Vercel billing payloads. */
function toPeriodISO(dateStr: string): string {
  const normalized = dateStr.slice(0, 10);
  return `${normalized}T00:00:00.000Z`;
}

/**
 * Returns fake JSONL string matching Vercel Billing API response shape.
 * For local/testing only. BilledCost (and EffectiveCost) are random around a mean with small variance.
 * Accepts from/to (YYYY-MM-DD); ChargePeriodStart/End are always YYYY-MM-DDT00:00:00.000Z.
 */
export function fakeVercelBilledResponse(from: string, to: string): string {
  const periodStart = toPeriodISO(from);
  const periodEnd = toPeriodISO(to);

  const means = [
    { mean: 10.5, service: "Serverless Functions", consumed: 1250, unit: "invocations", tags: { projectId: "prj_abc123" } },
    { mean: 2.2, service: "Bandwidth", consumed: 42, unit: "GB", tags: { projectId: "prj_abc123" } },
    { mean: 12.75, service: "Postgres", consumed: 750000, unit: "readUnits", tags: { projectId: "prj_def456", databaseId: "db_xyz789" } },
    { mean: 4.8, service: "Edge Functions", consumed: 380, unit: "invocations", tags: { projectId: "prj_abc123" } },
    { mean: 15.25, service: "KV", consumed: 125, unit: "GB", tags: { projectId: "prj_kv1" } },
    { mean: 1.1, service: "Blob", consumed: 210, unit: "GB", tags: { projectId: "prj_blob1" } },
    { mean: 34.5, service: "Image Optimization", consumed: 5000, unit: "images", tags: { projectId: "prj_abc123" } },
    { mean: 12.3, service: "Cron Jobs", consumed: 30, unit: "jobs", tags: { projectId: "prj_abc123" } },
    { mean: 25.0, service: "Web Analytics", consumed: 5000000, unit: "events", tags: { projectId: "prj_abc123" } },
    { mean: 14.8, service: "Log Drains", consumed: 80, unit: "GB", tags: { projectId: "prj_abc123" } },
  ];

  const lines = means.map(({ mean, service, consumed, unit, tags }) => {
    const billed = randomAroundMean(mean, 0.15);
    const effective = randomAroundMean(mean, 0.12);
    return {
      BilledCost: billed,
      BillingCurrency: "USD",
      ChargeCategory: "Usage",
      ChargePeriodStart: periodStart,
      ChargePeriodEnd: periodEnd,
      ConsumedQuantity: consumed,
      ConsumedUnit: unit,
      EffectiveCost: effective,
      ServiceName: service,
      ServiceProviderName: "Vercel",
      Tags: tags,
      PricingCategory: "Standard",
      PricingCurrency: "USD",
      PricingQuantity: consumed,
      PricingUnit: unit,
      RegionId: service === "Postgres" ? "iad1" : "global",
      RegionName: service === "Postgres" ? "Washington D.C." : "Global",
      ServiceCategory:
        service === "Serverless Functions" || service === "Edge Functions" || service === "Cron Jobs"
          ? "Compute"
          : service === "Bandwidth"
            ? "Networking"
            : service === "Postgres" || service === "KV"
              ? "Databases"
              : service === "Blob"
                ? "Storage"
                : service === "Image Optimization"
                  ? "Media"
                  : service === "Web Analytics"
                    ? "Analytics"
                    : "Observability",
    };
  });
  return lines.map((obj) => JSON.stringify(obj)).join("\n");
}

interface VercelChargeLine {
  date?: string;
  Date?: string;
  effectiveCost?: number;
  EffectiveCost?: number;
  total?: number;
  amount?: number;
  serviceName?: string;
  ServiceName?: string;
  name?: string;
}

function toAmountCents(value: number): number {
  if (value === 0) return 0;
  if (Math.abs(value) >= 100 && Number.isInteger(value)) return Math.round(value);
  return Math.round(value * 100);
}

function parseLine(line: string): DailySpendData | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let row: VercelChargeLine & { ChargePeriodStart?: string; ChargePeriodEnd?: string; BilledCost?: number };
  try {
    row = JSON.parse(trimmed) as typeof row;
  } catch {
    return null;
  }
  // Prefer BilledCost (invoiced amount); EffectiveCost is amortized (discounts/credits) and not what the user is actually billed.
  const cost = row.BilledCost ?? row.effectiveCost ?? row.EffectiveCost ?? row.total ?? row.amount;
  if (cost == null || typeof cost !== "number") return null;
  const dateStr = row.ChargePeriodStart ?? row.ChargePeriodEnd;
  if (!dateStr || typeof dateStr !== "string") return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const serviceName = row.serviceName ?? row.ServiceName ?? row.name ?? "Vercel";
  return {
    date,
    serviceName: typeof serviceName === "string" ? serviceName : "Vercel",
    amountCents: toAmountCents(cost),
    currency: "USD",
  };
}

export class VercelProvider implements ICloudProvider {
  constructor(private readonly encryption: EncryptionService) {}

  private getToken(cloudAccount: CloudAccount): string {
    const plaintext = this.encryption.decrypt(cloudAccount.encryptedCredentials);
    const payload = JSON.parse(plaintext) as { token?: string };
    const token = payload?.token;
    if (!token || typeof token !== "string") throw new Error("Vercel credentials: missing token");
    return token;
  }

  async fetchDailySpend(cloudAccount: CloudAccount, range: FetchRange): Promise<DailySpendData[]> {
    if (process.env.USE_FAKE_VERCEL_BILLING === "true") {
      return this.getVercelResults(fakeVercelBilledResponse(range.from, range.to));
    }

    const token = this.getToken(cloudAccount);
    const url = `${VERCEL_BILLING_URL}?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    if (response.status === 404) {
      const body = await response.text().catch(() => "");
      if (body.includes("costs_not_found") || body.toLowerCase().includes("not found")) return [];
    }

    if (response.status === 403) {
      const text = await response.text().catch(() => "");
      try {
        const json = JSON.parse(text) as { error?: { code?: string; message?: string; invalidToken?: boolean } };
        const err = json?.error;
        if (err?.invalidToken === true || (err?.message && /not authorized|invalid.*token/i.test(err.message))) {
          throw new SyncErrorWithKey(
            err?.message ?? "Not authorized",
            SYNC_ERROR_VERCEL_FORBIDDEN,
          );
        }
      } catch (e) {
        if (e instanceof SyncErrorWithKey) throw e;
      }
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Vercel billing API error: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 200)}` : ""}`);
    }

    const text = await response.text();
    return this.getVercelResults(text);
  }

  private getVercelResults(text: string): DailySpendData[] {
    const results: DailySpendData[] = [];
    for (const line of text.split("\n")) {
      const parsed = parseLine(line);
      if (parsed) results.push(parsed);
    }
    return results;
  }
}
