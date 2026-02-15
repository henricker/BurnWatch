"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  Cloud,
  Cpu,
  Database,
  Globe,
  Layers,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { fetchWithRetry } from "@/lib/safe-fetch";

/** API response shape (all monetary values in cents). */
interface AnomalyDetailItem {
  provider: string;
  serviceName: string;
  currentSpend: number;
  averageSpend: number;
  spikePercent: number;
  zScore: number;
}

interface AnalyticsResponse {
  totalCents: number;
  trendPercent: number | null;
  forecastCents: number | null;
  dailyBurnCents: number;
  anomalies: number;
  anomalyDetails: AnomalyDetailItem[];
  evolution: Array<{
    date: string;
    label: string;
    aws: number;
    vercel: number;
    gcp: number;
    total: number;
  }>;
  providerBreakdown: Array<{
    id: string;
    name: string;
    total: number;
    services: Array<{ name: string; cents: number }>;
  }>;
  categories: Array<{ label: string; cents: number }>;
}

type DateRangeKey = "7D" | "30D" | "MTD";
type ProviderFilterKey = "ALL" | "VERCEL" | "AWS" | "GCP";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function StatCardSmall({
  label,
  value,
  trend,
  trendType,
  description,
  highlight = false,
  isLoading = false,
  valueVariant,
}: {
  label: string;
  value: string;
  trend?: string;
  trendType: "up" | "down" | "neutral";
  description?: string;
  highlight?: boolean;
  isLoading?: boolean;
  /** Status card: "healthy" = emerald, "alert" = red; omit for default (neutral) */
  valueVariant?: "healthy" | "alert";
}) {
  const borderClass = highlight
    ? "border-orange-500/30"
    : "border-slate-200 dark:border-zinc-800";
  const valueColorClass =
    valueVariant === "healthy"
      ? "text-emerald-500 dark:text-emerald-400"
      : valueVariant === "alert"
        ? "text-red-500 dark:text-red-400"
        : "text-slate-900 dark:text-white";
  return (
    <div
      className={`bg-white dark:bg-[#0a0a0a] border rounded-2xl p-5 transition-all relative overflow-hidden ${borderClass}`}
    >
      <div className="flex justify-between items-start mb-3 relative z-10">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-600">
          {label}
        </p>
        {!isLoading && trend != null && (
          <div
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
              trendType === "up"
                ? "text-red-500 bg-red-500/10"
                : trendType === "down"
                  ? "text-green-500 bg-green-500/10"
                  : "text-slate-500 dark:text-zinc-400 bg-slate-500/10 dark:bg-zinc-500/10"
            }`}
          >
            {trendType === "up" && <ArrowUpRight size={10} />}
            {trendType === "down" && <ArrowDownRight size={10} />}
            {trend}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 relative z-10">
        {isLoading ? (
          <Skeleton className="h-8 w-24 rounded" />
        ) : (
          <>
            {(valueVariant === "healthy" || valueVariant === "alert") && (
              <span
                className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                  valueVariant === "healthy"
                    ? "bg-emerald-500 dark:bg-emerald-400"
                    : "bg-red-500 dark:bg-red-400"
                }`}
                aria-hidden
              />
            )}
            <span className={`text-2xl font-bold tracking-tight ${valueColorClass}`}>
              {value}
            </span>
            {description != null && (
              <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-600 uppercase italic">
                {description}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ServiceItem({
  name,
  cents,
  providerTotal,
}: {
  name: string;
  cents: number;
  providerTotal: number;
}) {
  const percentage = providerTotal > 0 ? (cents / providerTotal) * 100 : 0;
  return (
    <div className="flex items-center justify-between py-2 group/item">
      <div className="flex flex-col gap-1 flex-1">
        <div className="flex items-center justify-between pr-4">
          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 group-hover/item:text-slate-200 dark:group-hover/item:text-zinc-200 transition-colors uppercase tracking-wider">
            {name}
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-zinc-400">
            {formatCurrency(cents)}
          </span>
        </div>
        <div className="w-full h-[2px] bg-slate-100 dark:bg-zinc-900 rounded-full mt-1 overflow-hidden">
          <div
            className="h-full bg-slate-300 dark:bg-zinc-700 transition-all duration-700"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ProviderDrillDown({
  provider,
}: {
  provider: {
    id: string;
    name: string;
    total: number;
    icon: React.ReactNode;
    colorClass: string;
    services: Array<{ name: string; cents: number }>;
  };
}) {
  const t = useTranslations("Dashboard");
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div
      className={`border-b border-slate-100 dark:border-zinc-900/50 last:border-0 transition-all ${
        isOpen ? "bg-slate-50/30 dark:bg-zinc-900/10" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg bg-slate-100 dark:bg-zinc-900 ${provider.colorClass} transition-transform ${isOpen ? "rotate-90" : ""}`}
          >
            {isOpen ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={provider.colorClass}>{provider.icon}</span>
            <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-zinc-200">
              {provider.name}
            </span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
            {formatCurrency(provider.total)}
          </span>
          <span className="text-[9px] text-slate-400 dark:text-zinc-600 font-mono">
            {t("currencyUsd")}
          </span>
        </div>
      </button>
      {isOpen && (
        <div className="px-12 pb-6 animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-1">
            {provider.services.map((service, idx) => (
              <ServiceItem
                key={idx}
                name={service.name}
                cents={service.cents}
                providerTotal={provider.total}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Anomaly row: provider with chevron, expandable list of anomalous services (same pattern as ProviderDrillDown). */
function AnomalyProviderDrillDown({
  providerName,
  services,
  icon,
  colorClass,
  iconBgClass,
  serviceCountLabel,
}: {
  providerName: string;
  services: AnomalyDetailItem[];
  icon: React.ReactNode;
  colorClass: string;
  iconBgClass: string;
  serviceCountLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const maxSpike = Math.max(...services.map((s) => s.spikePercent), 0);
  return (
    <div
      className={`border-b border-orange-200/50 dark:border-orange-900/30 last:border-0 transition-all ${
        isOpen ? "bg-orange-50/20 dark:bg-orange-950/10" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-orange-50/30 dark:hover:bg-orange-950/20 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${iconBgClass} ${colorClass} transition-transform ${isOpen ? "rotate-90" : ""}`}
          >
            {isOpen ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={colorClass}>{icon}</span>
            <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-zinc-200">
              {providerName}
            </span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-500">
            +{maxSpike}%
          </span>
          <span className="text-[9px] text-slate-400 dark:text-zinc-600">
            {serviceCountLabel}
          </span>
        </div>
      </button>
      {isOpen && (
        <div className="px-12 pb-6 animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-1">
            {services.map((a, idx) => (
              <div
                key={`${a.serviceName}-${idx}`}
                className="flex items-center justify-between py-2 group/item"
              >
                <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 group-hover/item:text-slate-200 dark:group-hover/item:text-zinc-200 transition-colors uppercase tracking-wider">
                  {a.serviceName}
                </span>
                <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-500">
                  +{a.spikePercent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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
  const percentage = total > 0 ? Math.round((cents / total) * 100) : 0;
  const formattedValue = formatCurrency(cents);
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-slate-200/80 dark:bg-zinc-900 text-slate-600 dark:text-slate-400 group-hover:text-orange-500 dark:group-hover:text-orange-500 transition-colors [&_svg]:stroke-[1.5]">
            {icon}
          </div>
          <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-zinc-200 transition-colors uppercase tracking-widest">
            {label}
          </span>
        </div>
        <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-zinc-200">
          {formattedValue}
        </span>
      </div>
      <div className="w-full bg-slate-200/70 dark:bg-zinc-900 h-1 rounded-full overflow-hidden shadow-inner">
        <div
          className={`${colorClass} h-full transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  Compute: <Cpu size={14} />,
  Network: <Globe size={14} />,
  Database: <Database size={14} />,
  Storage: <Cloud size={14} />,
  Observability: <Activity size={14} />,
  Automation: <Clock size={14} />,
  Other: <Layers size={14} />,
};
const CATEGORY_COLOR: Record<string, string> = {
  Compute: "bg-orange-500",
  Network: "bg-blue-500",
  Database: "bg-zinc-500",
  Storage: "bg-emerald-500",
  Observability: "bg-violet-500",
  Automation: "bg-amber-500",
  Other: "bg-muted-foreground",
};

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const [dateRange, setDateRange] = useState<DateRangeKey>("MTD");
  const [providerFilter, setProviderFilter] = useState<ProviderFilterKey>("ALL");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartHover, setChartHover] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(
        `/api/analytics?dateRange=${dateRange}&providerFilter=${providerFilter}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to load");
      }
      const json = (await res.json()) as AnalyticsResponse;
      setData(json);
    } catch (e) {
      const message = e instanceof Error ? e.message : null;
      setError(message ?? "errorLoading");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange, providerFilter]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const totalCents = data?.totalCents ?? 0;
  const trendPercent = data?.trendPercent ?? null;
  const anomalyDetails = data?.anomalyDetails ?? [];
  const trendStr =
    trendPercent != null
      ? `${trendPercent >= 0 ? "+" : ""}${trendPercent.toFixed(1)}%`
      : undefined;
  const trendType: "up" | "down" | "neutral" =
    trendPercent != null
      ? trendPercent > 0
        ? "up"
        : trendPercent < 0
          ? "down"
          : "neutral"
      : "neutral";
  const forecastCents = data?.forecastCents ?? null;
  const dailyBurnCents = data?.dailyBurnCents ?? 0;
  const anomalies = data?.anomalies ?? 0;
  const evolution = data?.evolution ?? [];
  const providerBreakdown = data?.providerBreakdown ?? [];
  const categories = data?.categories ?? [];

  const chartHeight = 240;
  const chartWidth = 1000;
  const maxEvolutionTotal =
    evolution.length > 0
      ? providerFilter === "ALL"
        ? Math.max(...evolution.flatMap((e) => [e.aws, e.vercel, e.gcp]), 1)
        : Math.max(...evolution.map((e) => e.total), 1)
      : 1;

  type E = (typeof evolution)[number];
  const toPoints = (getCents: (e: E) => number) =>
    evolution.map((e, i) => {
      const x = (i / (evolution.length - 1 || 1)) * chartWidth;
      const y =
        chartHeight -
        (getCents(e) / maxEvolutionTotal) * (chartHeight - 20);
      return { x, y: Math.max(10, y) };
    });
  const toLineD = (pts: { x: number; y: number }[]) =>
    pts.length > 0
      ? pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ")
      : "";
  const toPathD = (pts: { x: number; y: number }[]) =>
    pts.length > 0
      ? pts
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`)
          .join(" ") +
        ` L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`
      : "";

  const isAllProviders = providerFilter === "ALL";
  const evolutionSeries =
    isAllProviders
      ? [
          { stroke: "#f97316", gradientId: "grad-burn-aws", getCents: (e: E) => e.aws },
          { stroke: "#3b82f6", gradientId: "grad-burn-vercel", getCents: (e: E) => e.vercel },
          { stroke: "#22c55e", gradientId: "grad-burn-gcp", getCents: (e: E) => e.gcp },
        ]
      : [
          {
            stroke:
              providerFilter === "VERCEL"
                ? "#3b82f6"
                :                 providerFilter === "GCP"
                  ? "#22c55e"
                  : "#f97316",
            gradientId: "grad-burn-single",
            getCents: (e: E) => e.total,
          },
        ];

  const evolutionSeriesWithPaths = evolutionSeries.map((s) => {
    const pts = toPoints(s.getCents);
    return {
      stroke: s.stroke,
      gradientId: s.gradientId,
      stopColor: s.stroke,
      pathD: toPathD(pts),
      lineD: toLineD(pts),
    };
  });

  const categoryLabelKey: Record<string, string> = {
    Compute: "categoryCompute",
    Network: "categoryBandwidth",
    Database: "categoryDatabase",
    Storage: "categoryStorage",
    Observability: "categoryObservability",
    Automation: "categoryAutomation",
    Other: "categoryOther",
  };

  const providerWithMeta = providerBreakdown.map((p) => ({
    ...p,
    icon:
      p.id === "vercel" ? (
        <Zap size={14} />
      ) : p.id === "aws" ? (
        <Cloud size={14} />
      ) : p.id === "gcp" ? (
        <Globe size={14} />
      ) : (
        <Layers size={14} />
      ),
    colorClass:
      p.id === "vercel"
        ? "text-slate-900 dark:text-white"
        : p.id === "aws"
          ? "text-orange-500"
          : p.id === "gcp"
            ? "text-blue-500"
            : "text-zinc-400",
  }));

  return (
    <div className="flex-1 bg-slate-50 dark:bg-[#050505] p-6 md:p-10 overflow-y-auto transition-colors duration-500">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Cabeçalho BurnWatch (Gemini) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-slate-200 dark:border-zinc-800/50">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
              <Zap size={24} className="fill-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t("analyticsCentral")}
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-[0.2em] font-black mt-1">
                {t("dashboardSubtitle")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex p-1 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm">
              {(["ALL", "VERCEL", "AWS", "GCP"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProviderFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    providerFilter === p
                      ? "bg-orange-500 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  }`}
                >
                  {p === "ALL" ? t("all") : t(p === "VERCEL" ? "providerVercel" : p === "AWS" ? "providerAws" : "providerGcp")}
                </button>
              ))}
            </div>
            <div className="flex p-1 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm">
              {(["7D", "30D", "MTD"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    dateRange === r
                      ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "text-slate-400"
                  }`}
                >
                  {t(`dateRange${r}` as "dateRange7D" | "dateRange30D" | "dateRangeMTD")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error === "errorLoading" ? t("errorLoading") : error}
          </div>
        )}

        {/* Top Grid: Métricas Macro (StatCardSmall) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSmall
            label={`${t("totalSpendLabel")} ${t(`dateRange${dateRange}` as "dateRange7D" | "dateRange30D" | "dateRangeMTD")}`}
            value={formatCurrency(totalCents)}
            trend={trendStr}
            trendType={trendType}
            highlight
            isLoading={loading}
          />
          <StatCardSmall
            label={t("forecast")}
            value={
              forecastCents != null
                ? formatCurrency(forecastCents)
                : "—"
            }
            description={t("endOfMonth")}
            trendType="neutral"
            isLoading={loading}
          />
          <StatCardSmall
            label={t("dailyBurn")}
            value={formatCurrency(dailyBurnCents)}
            description={t("avgDailyBurnDesc")}
            trendType="neutral"
            isLoading={loading}
          />
          <StatCardSmall
            label={t("status")}
            value={
              anomalies > 0 ? t("statusAlert") : t("statusHealthy")
            }
            description={
              anomalies > 0 ? t("statusAlertDesc") : t("statusHealthyDesc")
            }
            trendType="neutral"
            isLoading={loading}
            valueVariant={anomalies > 0 ? "alert" : "healthy"}
          />
        </div>

        {/* Central Grid: Evolução + Resource Breakdown + Spend by Category */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda: Gráfico de Evolução (Gemini) */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {t("evolutionTitle")}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-medium mt-1">
                  {t("evolutionSubtitle")}
                </p>
              </div>
              <div className="flex gap-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {(providerFilter === "ALL" || providerFilter === "AWS") && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    {t("providerAws")}
                  </div>
                )}
                {(providerFilter === "ALL" || providerFilter === "VERCEL") && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {t("providerVercel")}
                  </div>
                )}
                {(providerFilter === "ALL" || providerFilter === "GCP") && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {t("providerGcp")}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col w-full relative z-10">
              <div className="flex w-full" style={{ height: 220 }}>
                {loading ? (
                  <>
                    <div
                      className="flex flex-col justify-between shrink-0 pr-2"
                      style={{ width: "3.5rem" }}
                    >
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-3 w-10 rounded" />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0 h-full flex items-end gap-0.5 px-1 pb-2">
                      {Array.from({ length: 14 }).map((_, i) => (
                        <Skeleton
                          key={i}
                          className="flex-1 min-w-[4px] rounded-t"
                          style={{ height: `${30 + (i % 5) * 18}%` }}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                <div
                  className="flex flex-col justify-between shrink-0 pr-2 text-[10px] font-mono text-slate-400 dark:text-zinc-500 tabular-nums"
                  style={{ width: "3.5rem" }}
                >
                  {[1, 0.75, 0.5, 0.25, 0].map((frac) => (
                    <span key={frac}>
                      {formatCurrency(Math.round(maxEvolutionTotal * frac))}
                    </span>
                  ))}
                </div>
                <div
                  ref={chartContainerRef}
                  className="flex-1 min-w-0 h-full relative cursor-crosshair"
                  onMouseMove={(e) => {
                    if (evolution.length === 0) return;
                    const el = chartContainerRef.current;
                    if (!el) return;
                    const rect = el.getBoundingClientRect();
                    const frac = (e.clientX - rect.left) / rect.width;
                    const index = Math.min(
                      evolution.length - 1,
                      Math.max(0, Math.round(frac * (evolution.length - 1 || 1)))
                    );
                    setChartHover({ index, x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setChartHover(null)}
                >
                  <svg
                    className="w-full h-full pointer-events-none"
                    preserveAspectRatio="none"
                    viewBox={`0 0 ${chartWidth} 300`}
                  >
                    <defs>
                      {evolutionSeriesWithPaths.map((s) => (
                        <linearGradient
                          key={s.gradientId}
                          id={s.gradientId}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={s.stopColor} stopOpacity={isAllProviders ? "0.15" : "0.2"} />
                          <stop offset="100%" stopColor={s.stopColor} stopOpacity="0" />
                        </linearGradient>
                      ))}
                    </defs>
                    {[0, 1, 2, 3].map((i) => (
                      <line
                        key={i}
                        x1="0"
                        y1={i * 75 + 30}
                        x2={chartWidth}
                        y2={i * 75 + 30}
                        stroke="currentColor"
                        className="text-slate-100 dark:text-zinc-900"
                        strokeWidth="1"
                      />
                    ))}
                    {evolutionSeriesWithPaths.map((s) => (
                      <g key={s.gradientId}>
                        {s.pathD && <path d={s.pathD} fill={`url(#${s.gradientId})`} />}
                        {s.lineD && (
                          <path
                            d={s.lineD}
                            fill="none"
                            stroke={s.stroke}
                            strokeWidth={isAllProviders ? 2 : 3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </g>
                    ))}
                  </svg>
                  {chartHover !== null && evolution[chartHover.index] && (
                    <div
                      className="pointer-events-none fixed z-50 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 shadow-lg"
                      style={{
                        left: chartHover.x,
                        top: chartHover.y,
                        transform: "translate(-50%, calc(-100% - 8px))",
                      }}
                    >
                      <div className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                        {evolution[chartHover.index].label}
                      </div>
                      <div className="space-y-1 text-xs font-mono tabular-nums text-slate-800 dark:text-zinc-200">
                        {isAllProviders ? (
                          <>
                            <div className="flex justify-between gap-4">
                              <span className="text-orange-500">{t("providerAws")}</span>
                              <span>{formatCurrency(evolution[chartHover.index].aws)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-blue-500">{t("providerVercel")}</span>
                              <span>{formatCurrency(evolution[chartHover.index].vercel)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-green-500">{t("providerGcp")}</span>
                              <span>{formatCurrency(evolution[chartHover.index].gcp)}</span>
                            </div>
                            <div className="flex justify-between gap-4 pt-1 border-t border-slate-100 dark:border-zinc-800">
                              <span className="font-semibold">{t("totalSpendLabel")}</span>
                              <span>{formatCurrency(evolution[chartHover.index].total)}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between gap-4">
                            <span className="font-semibold">{t("totalSpendLabel")}</span>
                            <span>{formatCurrency(evolution[chartHover.index].total)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                  </>
                )}
              </div>
              <div className="flex mt-3">
                <div className="shrink-0" style={{ width: "3.5rem" }} />
                <div className="flex-1 min-w-0 relative h-5 px-1 pb-0.5">
                  {loading ? (
                    <div className="flex gap-2 justify-between px-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-3 w-12 rounded" />
                      ))}
                    </div>
                  ) : evolution.length > 0
                    ? (() => {
                        const n = evolution.length;
                        const indices =
                          n <= 8
                            ? Array.from({ length: n }, (_, i) => i)
                            : [0, Math.floor(n * 0.25), Math.floor(n * 0.5), Math.floor(n * 0.75), n - 1];
                        return indices.map((idx) => (
                          <span
                            key={evolution[idx].date}
                            className="absolute text-[10px] text-slate-400 dark:text-zinc-600 font-mono uppercase tracking-tighter whitespace-nowrap"
                            style={{
                              left: `${(idx / (n - 1 || 1)) * 100}%`,
                              transform: "translateX(-50%)",
                            }}
                          >
                            {evolution[idx].label}
                          </span>
                        ));
                      })()
                    : null}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Resource Breakdown (drill-down) + Spend by Category */}
          <div className="space-y-6">
            {/* Resource Breakdown (Gemini: collapsible ProviderDrillDown) */}
            <div className="group bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden flex flex-col shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-zinc-900 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/10">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-zinc-400">
                    {t("resourceBreakdownTitle")}
                  </h3>
                  <p className="text-[9px] text-slate-400 dark:text-zinc-600 uppercase tracking-widest mt-1">
                    {t("resourceBreakdownSubtitle")}
                  </p>
                </div>
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 border border-orange-500/20">
                  <Layers size={16} />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto scrollbar-hover-visible pr-3">
                {loading ? (
                  <div className="divide-y divide-slate-100 dark:divide-zinc-900/50">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 gap-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-16 rounded" />
                            <Skeleton className="h-3 w-12 rounded" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-20 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {providerWithMeta
                      .filter(
                        (p) =>
                          providerFilter === "ALL" ||
                          p.id.toUpperCase() === providerFilter
                      )
                      .map((provider) => (
                        <ProviderDrillDown key={provider.id} provider={provider} />
                      ))}
                    {providerWithMeta.length === 0 && (
                      <p className="p-6 text-[10px] text-slate-400 dark:text-zinc-600">
                        {t("noDataInRange")}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Spend by Category (Gemini) */}
            <div className="group bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm transition-colors">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-zinc-400">
                    {t("spendByCategoryTitle")}
                  </h3>
                  <p className="text-[9px] text-slate-400 dark:text-zinc-600 uppercase tracking-widest mt-1">
                    {t("spendByCategorySubtitle")}
                  </p>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 border border-blue-500/20">
                  <BarChart3 size={16} />
                </div>
              </div>
              {loading ? (
                <div className="max-h-64 overflow-y-auto pr-3 space-y-6">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-5 rounded" />
                          <Skeleton className="h-3 w-24 rounded" />
                        </div>
                        <Skeleton className="h-3 w-16 rounded" />
                      </div>
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <p className="text-[10px] text-slate-400 dark:text-zinc-600">
                  {t("noDataInRange")}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto scrollbar-hover-visible pr-3 space-y-6">
                  {categories.map((cat) => (
                    <CategoryItem
                      key={cat.label}
                      label={t(categoryLabelKey[cat.label] ?? "categoryOther")}
                      cents={cat.cents}
                      total={totalCents || 1}
                      icon={CATEGORY_ICON[cat.label] ?? CATEGORY_ICON.Other}
                      colorClass={CATEGORY_COLOR[cat.label] ?? CATEGORY_COLOR.Other}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Banner de Operação Estável / Alertas de Anomalia (estilo Detalhamento de Recursos) */}
        <div
          className={`bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden transition-colors group ${
            !loading && anomalies > 0
              ? "border-orange-200 dark:border-orange-800/50 bg-orange-50/30 dark:bg-orange-950/10"
              : ""
          }`}
        >
          <div className="p-6 flex flex-col md:flex-row items-center gap-6 border-b border-slate-100 dark:border-zinc-800/50">
            {loading ? (
              <>
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 w-full">
                  <Skeleton className="h-4 w-56 max-w-full rounded" />
                  <Skeleton className="h-3 w-full max-w-sm rounded" />
                </div>
              </>
            ) : (
              <>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border group-hover:scale-110 transition-transform ${
                anomalies > 0
                  ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                  : "bg-green-500/10 text-green-500 border-green-500/20"
              }`}
            >
              {anomalies > 0 ? (
                <AlertTriangle size={24} />
              ) : (
                <ShieldCheck size={24} />
              )}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4
                className={`text-sm font-bold uppercase tracking-widest ${
                  anomalies > 0
                    ? "text-orange-600 dark:text-orange-500"
                    : "text-green-600 dark:text-green-500"
                }`}
              >
                {anomalies > 0 ? t("anomalyAlertTitle") : t("operationalStable")}
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1 leading-relaxed">
                {anomalies > 0 && anomalyDetails.length > 0
                  ? (() => {
                      try {
                        const msg = t("anomalyAlertSubtitle");
                        return typeof msg === "string" && msg.startsWith("Dashboard.") ? "Click a provider to see services with a spike." : msg;
                      } catch {
                        return "Click a provider to see services with a spike.";
                      }
                    })()
                  : anomalies > 0
                    ? t("anomalyAlertMessage")
                    : t("operationalStableDesc")}
              </p>
            </div>
              </>
            )}
          </div>
          {!loading && anomalies > 0 && anomalyDetails.length > 0 && (() => {
            const providerMeta: Record<string, { name: string; icon: React.ReactNode; colorClass: string; iconBgClass: string }> = {
              aws: { name: "AWS", icon: <Cloud size={14} />, colorClass: "text-orange-500", iconBgClass: "bg-orange-500/10 border border-orange-500/20" },
              gcp: { name: "GCP", icon: <Globe size={14} />, colorClass: "text-green-500", iconBgClass: "bg-green-500/10 border border-green-500/20" },
              vercel: { name: "Vercel", icon: <Zap size={14} />, colorClass: "text-blue-500", iconBgClass: "bg-blue-500/10 border border-blue-500/20" },
            };
            const orderIds = ["aws", "gcp", "vercel"];
            const byProvider = new Map<string, AnomalyDetailItem[]>();
            for (const a of anomalyDetails) {
              const key = a.provider.toLowerCase();
              if (!byProvider.has(key)) byProvider.set(key, []);
              byProvider.get(key)!.push(a);
            }
            const sortedKeys = orderIds.filter((id) => byProvider.has(id));
            const otherKeys = [...byProvider.keys()].filter((k) => !orderIds.includes(k));
            const allKeys = [...sortedKeys, ...otherKeys];
            return (
              <div className="max-h-64 overflow-y-auto scrollbar-hover-visible">
                {allKeys.map((key) => {
                  const meta = providerMeta[key] ?? {
                    name: key.charAt(0).toUpperCase() + key.slice(1),
                    icon: <Layers size={14} />,
                    colorClass: "text-zinc-500",
                    iconBgClass: "bg-zinc-500/10 border border-zinc-500/20",
                  };
                  const services = byProvider.get(key)!;
                  let serviceCountLabel: string;
                  try {
                    serviceCountLabel = services.length === 1 ? t("anomalyOneService") : t("anomalyManyServices", { count: services.length });
                    if (typeof serviceCountLabel === "string" && serviceCountLabel.startsWith("Dashboard.")) {
                      serviceCountLabel = services.length === 1 ? "1 service" : `${services.length} services`;
                    }
                  } catch {
                    serviceCountLabel = services.length === 1 ? "1 service" : `${services.length} services`;
                  }
                  return (
                    <AnomalyProviderDrillDown
                      key={key}
                      providerName={meta.name}
                      services={services}
                      icon={meta.icon}
                      colorClass={meta.colorClass}
                      iconBgClass={meta.iconBgClass}
                      serviceCountLabel={serviceCountLabel}
                    />
                  );
                })}
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
}
