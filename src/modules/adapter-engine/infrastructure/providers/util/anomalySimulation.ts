/**
 * Helpers for anomaly simulation in fake billing data.
 * When ANOMALY_*_ACTIVE=true, the fake response for "today" inflates amounts
 * so that anomaly detection (Z-Score > 2, spike > 20%) and notifications can be tested.
 */

export type AnomalyProvider = "AWS" | "GCP" | "VERCEL";

const ENV_KEYS: Record<AnomalyProvider, string> = {
  AWS: "ANOMALY_AWS_ACTIVE",
  GCP: "ANOMALY_GCP_ACTIVE",
  VERCEL: "ANOMALY_VERCEL_ACTIVE",
};

/** Default multiplier so "today" spend clearly exceeds mean + 2*stdDev and 20% (e.g. 5x normal). */
const DEFAULT_SPIKE_MULTIPLIER = 5;

export function isAnomalySimulationEnabled(provider: AnomalyProvider): boolean {
  const key = ENV_KEYS[provider];
  const value = process.env[key];
  return value === "true" || value === "1";
}

export function getAnomalySpikeMultiplier(): number {
  const raw = process.env.ANOMALY_SPIKE_MULTIPLIER;
  if (raw == null || raw === "") return DEFAULT_SPIKE_MULTIPLIER;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_SPIKE_MULTIPLIER;
}

/** YYYY-MM-DD for today (UTC). */
export function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * True when the given date string (YYYY-MM-DD) is today (UTC).
 * Used to inflate only the "today" day in fake responses so anomaly detection triggers.
 */
export function isTodayDate(dateStr: string): boolean {
  return dateStr.slice(0, 10) === getTodayDateString();
}
