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

const VERCEL_BILLING_URL = "https://api.vercel.com/v1/billing/charges";

/**
 * Returns fake JSONL string matching Vercel Billing API response shape.
 * For local/testing only. Uses a fixed date so that repeated syncs upsert the same rows
 * (same org/account/service/date) and you see amount updates; with a dynamic "yesterday"
 * each day would create new rows instead of updating.
 */
export function fakeVercelBilledResponse(): string {
  const periodStart = "2026-01-03T00:00:00.000Z";
  const periodEnd = "2026-01-04T00:00:00.000Z";

  const lines = [
    { BilledCost: 10.5, BillingCurrency: "USD", ChargeCategory: "Usage", ChargePeriodStart: periodStart, ChargePeriodEnd: periodEnd, ConsumedQuantity: 1250, ConsumedUnit: "invocations", EffectiveCost: 12.5, ServiceName: "Serverless Functions", ServiceProviderName: "Vercel", Tags: { projectId: "prj_abc123" }, PricingCategory: "Standard", PricingCurrency: "USD", PricingQuantity: 1250, PricingUnit: "invocations", RegionId: "global", RegionName: "Global", ServiceCategory: "Compute" },
    { BilledCost: 2.2, BillingCurrency: "USD", ChargeCategory: "Usage", ChargePeriodStart: periodStart, ChargePeriodEnd: periodEnd, ConsumedQuantity: 42, ConsumedUnit: "GB", EffectiveCost: 4.2, ServiceName: "Bandwidth", ServiceProviderName: "Vercel", Tags: { projectId: "prj_abc123" }, PricingCategory: "Standard", PricingCurrency: "USD", PricingQuantity: 42, PricingUnit: "GB", RegionId: "global", RegionName: "Global", ServiceCategory: "Networking" },
    { BilledCost: 12.75, BillingCurrency: "USD", ChargeCategory: "Usage", ChargePeriodStart: periodStart, ChargePeriodEnd: periodEnd, ConsumedQuantity: 750000, ConsumedUnit: "readUnits", EffectiveCost: 0.75, ServiceName: "Postgres", ServiceProviderName: "Vercel", Tags: { projectId: "prj_def456", databaseId: "db_xyz789" }, PricingCategory: "Standard", PricingCurrency: "USD", PricingQuantity: 750000, PricingUnit: "readUnits", RegionId: "iad1", RegionName: "Washington D.C.", ServiceCategory: "Databases" },
    { BilledCost: 4.8, BillingCurrency: "USD", ChargeCategory: "Usage", ChargePeriodStart: periodStart, ChargePeriodEnd: periodEnd, ConsumedQuantity: 380, ConsumedUnit: "invocations", EffectiveCost: 3.8, ServiceName: "Edge Functions", ServiceProviderName: "Vercel", Tags: { projectId: "prj_abc123" }, PricingCategory: "Standard", PricingCurrency: "USD", PricingQuantity: 380, PricingUnit: "invocations", RegionId: "global", RegionName: "Global", ServiceCategory: "Compute" },
    { BilledCost: 15.25, BillingCurrency: "USD", ChargeCategory: "Usage", ChargePeriodStart: periodStart, ChargePeriodEnd: periodEnd, ConsumedQuantity: 125, ConsumedUnit: "GB", EffectiveCost: 1.25, ServiceName: "KV", ServiceProviderName: "Vercel", Tags: { projectId: "prj_kv1" }, PricingCategory: "Standard", PricingCurrency: "USD", PricingQuantity: 125, PricingUnit: "GB", RegionId: "global", RegionName: "Global", ServiceCategory: "Databases" },
    { BilledCost: 1.1, BillingCurrency: "USD", ChargeCategory: "Usage", ChargePeriodStart: periodStart, ChargePeriodEnd: periodEnd, ConsumedQuantity: 210, ConsumedUnit: "GB", EffectiveCost: 2.1, ServiceName: "Blob", ServiceProviderName: "Vercel", Tags: { projectId: "prj_blob1" }, PricingCategory: "Standard", PricingCurrency: "USD", PricingQuantity: 210, PricingUnit: "GB", RegionId: "global", RegionName: "Global", ServiceCategory: "Storage" },
    { BilledCost: 34.5, BillingCurrency: "USD", ChargeCategory: "Usage", ChargePeriodStart: periodStart, ChargePeriodEnd: periodEnd, ConsumedQuantity: 5000, ConsumedUnit: "images", EffectiveCost: 0.5, ServiceName: "Image Optimization", ServiceProviderName: "Vercel", Tags: { projectId: "prj_abc123" }, PricingCategory: "Standard", PricingCurrency: "USD", PricingQuantity: 5000, PricingUnit: "images", RegionId: "global", RegionName: "Global", ServiceCategory: "Media" },
    { BilledCost: 12.3, BillingCurrency: "USD", ChargeCategory: "Usage", ChargePeriodStart: periodStart, ChargePeriodEnd: periodEnd, ConsumedQuantity: 30, ConsumedUnit: "jobs", EffectiveCost: 0.3, ServiceName: "Cron Jobs", ServiceProviderName: "Vercel", Tags: { projectId: "prj_abc123" }, PricingCategory: "Standard", PricingCurrency: "USD", PricingQuantity: 30, PricingUnit: "jobs", RegionId: "global", RegionName: "Global", ServiceCategory: "Compute" },
    { BilledCost: 25.0, BillingCurrency: "USD", ChargeCategory: "Usage", ChargePeriodStart: periodStart, ChargePeriodEnd: periodEnd, ConsumedQuantity: 5000000, ConsumedUnit: "events", EffectiveCost: 5.0, ServiceName: "Web Analytics", ServiceProviderName: "Vercel", Tags: { projectId: "prj_abc123" }, PricingCategory: "Standard", PricingCurrency: "USD", PricingQuantity: 5000000, PricingUnit: "events", RegionId: "global", RegionName: "Global", ServiceCategory: "Analytics" },
    { BilledCost: 14.8, BillingCurrency: "USD", ChargeCategory: "Usage", ChargePeriodStart: periodStart, ChargePeriodEnd: periodEnd, ConsumedQuantity: 80, ConsumedUnit: "GB", EffectiveCost: 0.8, ServiceName: "Log Drains", ServiceProviderName: "Vercel", Tags: { projectId: "prj_abc123" }, PricingCategory: "Standard", PricingCurrency: "USD", PricingQuantity: 80, PricingUnit: "GB", RegionId: "global", RegionName: "Global", ServiceCategory: "Observability" },
  ];
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
      return this.getVercelResults(fakeVercelBilledResponse());
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
