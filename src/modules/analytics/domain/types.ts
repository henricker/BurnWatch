import type { SpendCategory } from "./serviceNameToCategory";

export type DateRangeKey = "7D" | "30D" | "MTD";
export type ProviderFilterKey = "ALL" | "VERCEL" | "AWS" | "GCP";

export interface DashboardAnalyticsInput {
  organizationId: string;
  dateRange: DateRangeKey;
  providerFilter: ProviderFilterKey;
}

export interface EvolutionDay {
  date: string;
  label: string;
  aws: number;
  vercel: number;
  gcp: number;
  total: number;
}

export interface ProviderBreakdownItem {
  id: string;
  name: string;
  total: number;
  services: { name: string; cents: number }[];
}

export interface CategoryItem {
  label: SpendCategory;
  cents: number;
}

/** Single anomaly for dashboard display (per provider + service). */
export interface AnomalyDetail {
  provider: string;
  serviceName: string;
  currentSpend: number;
  averageSpend: number;
  spikePercent: number;
  zScore: number;
}

export interface DashboardAnalyticsResult {
  totalCents: number;
  trendPercent: number | null;
  forecastCents: number | null;
  dailyBurnCents: number;
  anomalies: number;
  anomalyDetails: AnomalyDetail[];
  evolution: EvolutionDay[];
  providerBreakdown: ProviderBreakdownItem[];
  categories: CategoryItem[];
}
