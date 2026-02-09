/**
 * Maps technical service names (from providers) to universal categories.
 */
export type SpendCategory =
  | "Compute"
  | "Network"
  | "Database"
  | "Storage"
  | "Observability"
  | "Automation"
  | "Other";

const VERCEL_SERVICE_CATEGORY: Record<string, SpendCategory> = {
  "Serverless Functions": "Compute",
  "Edge Functions": "Compute",
  Bandwidth: "Network",
  "Image Optimization": "Network",
  "Log Drains": "Network",
  Postgres: "Database",
  KV: "Database",
  Blob: "Storage",
  "Web Analytics": "Observability",
  "Cron Jobs": "Automation",
};

const COMPUTE_KEYWORDS = [
  "edge function",
  "lambda",
  "ec2",
  "cloud run",
  "compute",
  "functions",
  "serverless",
];
const NETWORK_KEYWORDS = [
  "bandwidth",
  "data transfer",
  "cdn",
  "egress",
  "ingress",
  "network",
  "image optimization",
  "log drains",
];
const DATABASE_KEYWORDS = [
  "rds",
  "postgres",
  "cloud sql",
  "dynamodb",
  "bigtable",
  "bigquery",
  "database",
  "aurora",
  "kv",
];
const STORAGE_KEYWORDS = ["s3", "storage", "cloud storage", "bucket", "blob"];
const OBSERVABILITY_KEYWORDS = ["web analytics", "observability"];
const AUTOMATION_KEYWORDS = ["cron"];

function matchesKeyword(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function serviceNameToCategory(serviceName: string): SpendCategory {
  const exact = VERCEL_SERVICE_CATEGORY[serviceName];
  if (exact) return exact;
  if (matchesKeyword(serviceName, COMPUTE_KEYWORDS)) return "Compute";
  if (matchesKeyword(serviceName, NETWORK_KEYWORDS)) return "Network";
  if (matchesKeyword(serviceName, DATABASE_KEYWORDS)) return "Database";
  if (matchesKeyword(serviceName, STORAGE_KEYWORDS)) return "Storage";
  if (matchesKeyword(serviceName, OBSERVABILITY_KEYWORDS)) return "Observability";
  if (matchesKeyword(serviceName, AUTOMATION_KEYWORDS)) return "Automation";
  return "Other";
}
