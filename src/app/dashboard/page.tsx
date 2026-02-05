"use client";

import {
  AlertTriangle,
  ChevronRight,
  Cloud,
  Cpu,
  Database,
  Globe,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";

function MetricCard({
  label,
  value,
  trend,
  trendType,
  description,
  highlight,
}: {
  label: string;
  value: string;
  trend: string;
  trendType: "up" | "down" | "neutral";
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border border-primary/30 bg-card p-5 shadow-[0_0_20px_hsl(var(--primary)/0.08)] transition-colors"
          : "rounded-xl border border-border bg-card p-5 transition-colors hover:border-muted-foreground/30"
      }
    >
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <span
          className={
            trendType === "up"
              ? "text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded"
              : trendType === "down"
                ? "text-[10px] font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded"
                : "text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded"
          }
        >
          {trend}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground">
          {value}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">USD</span>
      </div>
      <p className="mt-2 line-clamp-1 text-[10px] italic text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function CategoryItem({
  label,
  cents,
  total,
  icon,
  colorClass,
}: {
  label: string;
  cents: number;
  total: number;
  icon: React.ReactNode;
  colorClass: string;
}) {
  const percentage = Math.round((cents / total) * 100);
  const formattedValue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

  return (
    <div className="group">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded border border-border bg-muted/50 p-1.5 text-muted-foreground transition-colors group-hover:text-primary">
            {icon}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            {label}
          </span>
        </div>
        <span className="text-[11px] font-mono font-bold text-foreground">
          {formattedValue}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className={`h-full transition-all duration-1000 ease-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations("Dashboard");

  return (
    <div className="w-full space-y-8 p-6">
      {/* Welcome & actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {t("overviewTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("overviewSubtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t("exportCsv")}
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-colors hover:bg-primary/90"
          >
            {t("generateReport")}
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("totalSpendMtd")}
          value="$1,245.80"
          trend="+12.4%"
          trendType="up"
          description={t("totalSpendMtdDesc")}
        />
        <MetricCard
          label={t("projectionEom")}
          value="$1,580.00"
          trend="-2.1%"
          trendType="down"
          description={t("projectionEomDesc")}
          highlight
        />
        <MetricCard
          label={t("avgDailyBurn")}
          value="$41.50"
          trend="+5.0%"
          trendType="up"
          description={t("avgDailyBurnDesc")}
        />
        <MetricCard
          label={t("anomalyScore")}
          value="8/100"
          trend={t("trendSafe")}
          trendType="neutral"
          description={t("anomalyScoreDesc")}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main chart */}
        <div className="overflow-hidden rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {t("dailyConsumptionByProvider")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("dailyConsumptionSubtitle")}
              </p>
            </div>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                {t("providerAws")}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                {t("providerVercel")}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                {t("providerGcp")}
              </div>
            </div>
          </div>

          <div className="relative h-64 w-full">
            <svg
              className="h-full w-full"
              preserveAspectRatio="none"
              viewBox="0 0 1000 300"
            >
              <defs>
                <linearGradient
                  id="gradAWS"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity="0.4"
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((i) => (
                <line
                  key={i}
                  x1="0"
                  y1={i * 75 + 30}
                  x2="1000"
                  y2={i * 75 + 30}
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                />
              ))}
              <path
                d="M0,280 Q100,200 200,240 T400,120 T600,180 T800,80 T1000,100 L1000,300 L0,300 Z"
                fill="url(#gradAWS)"
              />
              <path
                d="M0,280 Q100,200 200,240 T400,120 T600,180 T800,80 T1000,100"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                className="drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
              />
              <path
                d="M0,290 Q150,270 300,260 T600,250 T1000,240"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </svg>
            <div className="mt-4 flex justify-between px-1">
              {["01 Feb", "07 Feb", "14 Feb", "21 Feb", "28 Feb"].map((date) => (
                <span
                  key={date}
                  className="text-[10px] font-mono text-muted-foreground"
                >
                  {date}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Allocation by category */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-6 text-sm font-bold text-foreground">
            {t("allocationByCategory")}
          </h3>
          <div className="space-y-6">
            <CategoryItem
              label={t("categoryCompute")}
              cents={64580}
              total={124580}
              icon={<Cpu size={14} />}
              colorClass="bg-orange-500"
            />
            <CategoryItem
              label={t("categoryDatabase")}
              cents={31000}
              total={124580}
              icon={<Database size={14} />}
              colorClass="bg-blue-500"
            />
            <CategoryItem
              label={t("categoryBandwidth")}
              cents={18000}
              total={124580}
              icon={<Globe size={14} />}
              colorClass="bg-muted-foreground"
            />
            <CategoryItem
              label={t("categoryStorage")}
              cents={11000}
              total={124580}
              icon={<Cloud size={14} />}
              colorClass="bg-emerald-500"
            />
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("budgetMonthly")}</span>
              <span className="text-foreground">$2,000.00</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: "62%" }}
              />
            </div>
            <p className="mt-2 text-[10px] italic text-muted-foreground">
              {t("budgetConsumed")}
            </p>
          </div>
        </div>
      </div>

      {/* Anomaly & insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex gap-4 rounded-lg border border-orange-200 bg-orange-50/90 p-4 dark:border-orange-800/30 dark:bg-orange-950/10">
          <div className="rounded-md border border-orange-200 bg-orange-100 p-2 text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-500">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-orange-900 dark:text-orange-300">
              {t("anomalyAlertTitle")}
            </h4>
            <p className="mt-1 text-xs text-orange-800 dark:text-orange-400/80">
              {t("anomalyAlertMessage")}
            </p>
            <button
              type="button"
              className="mt-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-600 transition-colors hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
            >
              {t("investigateCause")}
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

        <div className="flex gap-4 rounded-lg border border-border bg-card p-4">
          <div className="rounded-md border border-border bg-muted/50 p-2 text-muted-foreground">
            <TrendingUp size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-foreground">
              {t("optimizationInsightsTitle")}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("optimizationInsightsMessage")}
            </p>
            <button
              type="button"
              className="mt-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:text-primary/90"
            >
              {t("viewRecommendations")}
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
