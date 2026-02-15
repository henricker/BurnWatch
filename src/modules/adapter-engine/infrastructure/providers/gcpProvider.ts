import type { CloudAccount } from "@prisma/client";
import { BigQuery } from "@google-cloud/bigquery";

import type { EncryptionService } from "@/lib/security/encryption";

import type {
  DailySpendData,
  FetchRange,
  ICloudProvider,
} from "../../domain/cloudProvider";
import {
  SyncErrorWithKey,
  SYNC_ERROR_GCP_BILLING_EXPORT,
  SYNC_ERROR_GCP_INVALID_CREDENTIALS,
} from "../../domain/cloudProvider";
import {
  getAnomalySpikeMultiplier,
  isAnomalySimulationEnabled,
  isTodayDate,
} from "./util/anomalySimulation";
import { randomAroundMean } from "./util/randomAroundMean";

/** Stored plaintext after decrypt: billingAccountId + full Service Account JSON string. */
export interface GcpCredentialsPayload {
  billingAccountId?: string;
  serviceAccountJson?: string;
}

/** Parsed Service Account key file (subset we need for BigQuery auth). */
export interface GcpServiceAccountKey {
  project_id: string;
  private_key: string;
  client_email: string;
}

const DEFAULT_BILLING_DATASET_ID = "billing_export";

function parseGcpDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map((x) => Number(x));
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function amountToCents(cost: number, currencyConversionRate: number): number {
  if (!Number.isFinite(cost)) return 0;
  const rate = Number.isFinite(currencyConversionRate) && currencyConversionRate > 0
    ? currencyConversionRate
    : 1;
  const usd = cost / rate;
  return Math.round(usd * 100);
}

function randomAroundMeanGcp(mean: number, stdDevRatio: number = 0.12): number {
  if (mean <= 0) return 0;
  return randomAroundMean(mean, stdDevRatio);
}

/**
 * Fake GCP billing data for local/dev. Services aligned with serviceNameToCategory (Compute, Database, etc.).
 * When ANOMALY_GCP_ACTIVE=true, "today" amounts are inflated to simulate a spike for anomaly testing.
 */
export function fakeGcpBilledResponse(range: FetchRange): DailySpendData[] {
  const date = parseGcpDate(range.from);
  const compute = randomAroundMeanGcp(120);
  const bigquery = randomAroundMeanGcp(45);
  const cloudRun = randomAroundMeanGcp(28);
  const cloudStorage = randomAroundMeanGcp(15);
  const mult =
    isAnomalySimulationEnabled("GCP") && isTodayDate(range.from)
      ? getAnomalySpikeMultiplier()
      : 1;
  return [
    {
      date,
      serviceName: "Compute Engine",
      amountCents: Math.round(compute * 100 * mult),
      currency: "USD",
    },
    {
      date,
      serviceName: "BigQuery",
      amountCents: Math.round(bigquery * 100 * mult),
      currency: "USD",
    },
    {
      date,
      serviceName: "Cloud Run",
      amountCents: Math.round(cloudRun * 100 * mult),
      currency: "USD",
    },
    {
      date,
      serviceName: "Cloud Storage",
      amountCents: Math.round(cloudStorage * 100 * mult),
      currency: "USD",
    },
  ];
}

/**
 * Parse and validate decrypted GCP credentials (billingAccountId + serviceAccountJson).
 * serviceAccountJson must be valid JSON with type "service_account", project_id, private_key, client_email.
 */
export function parseGcpCredentials(plaintext: string): {
  billingAccountId: string;
  serviceAccountKey: GcpServiceAccountKey;
} {
  let payload: GcpCredentialsPayload;
  try {
    payload = JSON.parse(plaintext) as GcpCredentialsPayload;
  } catch {
    throw new SyncErrorWithKey(
      "GCP credentials: invalid JSON",
      SYNC_ERROR_GCP_INVALID_CREDENTIALS,
    );
  }

  const billingAccountId = typeof payload.billingAccountId === "string"
    ? payload.billingAccountId.trim()
    : "";
  const serviceAccountJson = typeof payload.serviceAccountJson === "string"
    ? payload.serviceAccountJson.trim()
    : "";

  if (!billingAccountId || !serviceAccountJson) {
    throw new SyncErrorWithKey(
      "GCP credentials: missing billingAccountId or serviceAccountJson",
      SYNC_ERROR_GCP_INVALID_CREDENTIALS,
    );
  }

  let keyObj: unknown;
  try {
    keyObj = JSON.parse(serviceAccountJson) as unknown;
  } catch {
    throw new SyncErrorWithKey(
      "GCP credentials: serviceAccountJson is not valid JSON",
      SYNC_ERROR_GCP_INVALID_CREDENTIALS,
    );
  }

  const obj = keyObj as Record<string, unknown>;
  if (obj?.type !== "service_account") {
    throw new SyncErrorWithKey(
      'GCP credentials: JSON must have "type": "service_account"',
      SYNC_ERROR_GCP_INVALID_CREDENTIALS,
    );
  }

  const project_id = typeof obj.project_id === "string" ? obj.project_id : "";
  const private_key = typeof obj.private_key === "string" ? obj.private_key : "";
  const client_email = typeof obj.client_email === "string" ? obj.client_email : "";

  if (!project_id || !private_key || !client_email) {
    throw new SyncErrorWithKey(
      "GCP credentials: service account JSON must include project_id, private_key, and client_email",
      SYNC_ERROR_GCP_INVALID_CREDENTIALS,
    );
  }

  return {
    billingAccountId,
    serviceAccountKey: { project_id, private_key, client_email },
  };
}

export class GcpProvider implements ICloudProvider {
  constructor(private readonly encryption: EncryptionService) {}

  private getCredentials(cloudAccount: CloudAccount): {
    billingAccountId: string;
    serviceAccountKey: GcpServiceAccountKey;
  } {
    const plaintext = this.encryption.decrypt(cloudAccount.encryptedCredentials);
    return parseGcpCredentials(plaintext);
  }

  async fetchDailySpend(
    cloudAccount: CloudAccount,
    range: FetchRange,
  ): Promise<DailySpendData[]> {
    if (process.env.USE_FAKE_GCP_BILLING === "true") {
      return fakeGcpBilledResponse(range);
    }

    const { billingAccountId, serviceAccountKey } = this.getCredentials(cloudAccount);
    const datasetId = process.env.GCP_BILLING_DATASET_ID ?? DEFAULT_BILLING_DATASET_ID;
    const tableId = `gcp_billing_export_v1_${billingAccountId.replace(/-/g, "_")}`;
    const fullTableId = `${serviceAccountKey.project_id}.${datasetId}.${tableId}`;

    const bigquery = new BigQuery({
      projectId: serviceAccountKey.project_id,
      credentials: {
        client_email: serviceAccountKey.client_email,
        private_key: serviceAccountKey.private_key,
      },
    });

    const query = `
      SELECT
        DATE(usage_start_time) AS usage_date,
        service.description AS service_description,
        SUM(cost) AS total_cost,
        MAX(currency) AS currency,
        MAX(IFNULL(currency_conversion_rate, 1)) AS currency_conversion_rate
      FROM \`${fullTableId}\`
      WHERE billing_account_id = @billingAccountId
        AND usage_start_time >= @startTime
        AND usage_start_time < @endTime
      GROUP BY usage_date, service_description
      ORDER BY usage_date, service_description
    `;

    const options = {
      query,
      params: {
        billingAccountId,
        startTime: `${range.from}T00:00:00Z`,
        endTime: `${range.to}T00:00:00Z`,
      },
    };

    try {
      const [rows] = await bigquery.query(options);

      const results: DailySpendData[] = [];
      for (const row of rows as Array<{
        usage_date: { value: string };
        service_description: string;
        total_cost: number;
        currency: string;
        currency_conversion_rate: number;
      }>) {
        const dateValue = row.usage_date?.value ?? row.usage_date;
        const dateStr = typeof dateValue === "string" ? dateValue : "";
        const date = parseGcpDate(dateStr);
        const cost = Number(row.total_cost ?? 0);
        const rate = Number(row.currency_conversion_rate ?? 1);
        const amountCents = amountToCents(cost, rate);
        if (amountCents === 0) continue;

        const serviceName = typeof row.service_description === "string"
          ? row.service_description
          : "Google Cloud";
        results.push({
          date,
          serviceName,
          amountCents,
          currency: row.currency ?? "USD",
        });
      }
      return results;
    } catch (err) {
      const anyErr = err as { message?: string; code?: number };
      const message = anyErr?.message ?? "Unknown error";
      if (
        /not found|does not exist|404|Permission denied|403/i.test(message) ||
        anyErr?.code === 404 ||
        anyErr?.code === 403
      ) {
        throw new SyncErrorWithKey(
          "GCP Billing Export to BigQuery is not set up or not accessible. Enable export and grant the service account access to the dataset.",
          SYNC_ERROR_GCP_BILLING_EXPORT,
        );
      }
      if (/invalid|credential|unauthorized|401/i.test(message) || anyErr?.code === 401) {
        throw new SyncErrorWithKey(
          message,
          SYNC_ERROR_GCP_INVALID_CREDENTIALS,
        );
      }
      throw err;
    }
  }
}
