import type { PrismaClient, CloudProvider } from "@prisma/client";

import type { ProviderAnomalyGroup, ServiceAnomaly } from "../../../domain/types";
import { SendAnomalyAlertUseCase } from "../send-anomaly-alert-usecase";

const ANOMALY_HISTORY_DAYS = 14;

type ServiceStats = {
  history: number[];
  today: number;
};

export interface TriggerAnomalyAlertAfterSyncParams {
  organizationId: string;
}

/**
 * After a successful cloud account sync, fetches recent daily spend, detects
 * per-service anomalies (Z-Score > 2, spike > 20%, min $1), builds a
 * MultiCloudAnomalyReport and sends it via SendAnomalyAlertUseCase.
 * Errors are swallowed so notification failures never affect the sync flow.
 */
export class TriggerAnomalyAlertAfterSyncUseCase {
  private readonly sendAnomalyAlert: SendAnomalyAlertUseCase;

  constructor(
    private readonly prisma: PrismaClient,
    sendAnomalyAlert?: SendAnomalyAlertUseCase,
  ) {
    this.sendAnomalyAlert = sendAnomalyAlert ?? new SendAnomalyAlertUseCase(prisma);
  }

  async execute(params: TriggerAnomalyAlertAfterSyncParams): Promise<void> {
    try {
      const { organizationId } = params;

      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - ANOMALY_HISTORY_DAYS);

      const rows = await this.prisma.dailySpend.findMany({
        where: {
          organizationId,
          date: { gte: start, lte: end },
        },
        orderBy: { date: "asc" },
      });

      if (rows.length === 0) return;

      const grouping = new Map<CloudProvider, Map<string, ServiceStats>>();
      const todayStr = new Date().toISOString().slice(0, 10);

      for (const row of rows) {
        const rowDateStr = row.date.toISOString().slice(0, 10);

        if (!grouping.has(row.provider)) {
          grouping.set(row.provider, new Map());
        }
        const servicesMap = grouping.get(row.provider)!;
        if (!servicesMap.has(row.serviceName)) {
          servicesMap.set(row.serviceName, { history: [], today: 0 });
        }
        const stats = servicesMap.get(row.serviceName)!;

        if (rowDateStr === todayStr) {
          stats.today += row.amountCents;
        } else {
          stats.history.push(row.amountCents);
        }
      }

      const report: {
        totalImpactCents: number;
        providers: Record<string, ProviderAnomalyGroup>;
      } = {
        totalImpactCents: 0,
        providers: {},
      };

      let hasAnomalies = false;

      for (const [provider, services] of grouping.entries()) {
        const affectedServices: ServiceAnomaly[] = [];
        let providerTotalImpact = 0;

        for (const [serviceName, stats] of services.entries()) {
          const anomaly = this.checkServiceAnomaly(stats);
          if (anomaly) {
            hasAnomalies = true;
            const impact = stats.today - anomaly.averageSpend;
            providerTotalImpact += impact;
            report.totalImpactCents += impact;
            affectedServices.push({
              name: serviceName,
              currentSpend: stats.today,
              averageSpend: anomaly.averageSpend,
              spikePercent: anomaly.spikePercent,
              zScore: anomaly.zScore,
            });
          }
        }

        if (affectedServices.length > 0) {
          affectedServices.sort((a, b) => b.currentSpend - a.currentSpend);
          report.providers[provider] = {
            services: affectedServices,
            providerTotal: providerTotalImpact,
          };
        }
      }

      if (hasAnomalies) {
        await this.sendAnomalyAlert.execute({
          organizationId,
          report,
        });
      }
    } catch (_err) {
      if (process.env.NODE_ENV !== "test") {
        console.error("[TriggerAnomalyAlertAfterSyncUseCase]", _err);
      }
    }
  }

  /**
   * Z-Score > 2, value > $1 (100 cents), spike > 20% above mean.
   */
  private checkServiceAnomaly(stats: ServiceStats): { averageSpend: number; spikePercent: number; zScore: number } | null {
    const { history, today } = stats;
    if (history.length < 3) return null;

    const sum = history.reduce((a, b) => a + b, 0);
    const mean = sum / history.length;
    const variance = history.reduce((acc, val) => acc + (val - mean) ** 2, 0) / history.length;
    const stdDev = Math.sqrt(variance);

    const isAnomaly =
      stdDev > 0 &&
      today > mean + 2 * stdDev &&
      today > 100 &&
      today > mean * 1.2;

    if (!isAnomaly) return null;

    return {
      averageSpend: Math.round(mean),
      spikePercent: Math.round(((today - mean) / mean) * 100),
      zScore: (today - mean) / stdDev,
    };
  }
}
