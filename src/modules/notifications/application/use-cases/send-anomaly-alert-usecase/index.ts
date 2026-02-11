import type { PrismaClient } from "@prisma/client";

import type { INotificationProvider } from "../../../domain/notificationProvider";
// Importamos o novo tipo MultiCloudAnomalyReport que definimos na análise de cascata
import type { MultiCloudAnomalyReport, NotificationSettings } from "../../../domain/types"; 
import { DEFAULT_NOTIFICATION_SETTINGS } from "../../../domain/types";
import { getOwnerLocale } from "../../../domain/get-owner-locale";
import { SlackProvider } from "../../../infrastructure/slackProvider";
import { DiscordProvider } from "../../../infrastructure/discordProvider";

function getDashboardUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}/dashboard`;
}

function parseNotificationSettings(settings: unknown): NotificationSettings {
  if (settings == null || typeof settings !== "object") {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
  const o = settings as Record<string, unknown>;
  return {
    anomaly: typeof o.anomaly === "boolean" ? o.anomaly : DEFAULT_NOTIFICATION_SETTINGS.anomaly,
    dailySummary:
      typeof o.dailySummary === "boolean" ? o.dailySummary : DEFAULT_NOTIFICATION_SETTINGS.dailySummary,
    limitWarning:
      typeof o.limitWarning === "boolean" ? o.limitWarning : DEFAULT_NOTIFICATION_SETTINGS.limitWarning,
  };
}

export interface SendAnomalyAlertParams {
  organizationId: string;
  // Agora aceitamos o report consolidado em vez de um alerta único
  report: Omit<MultiCloudAnomalyReport, "organizationName" | "dashboardUrl">;
}

/**
 * Sends consolidated anomaly alert to all configured webhooks (Slack, Discord).
 * Only sends if notificationSettings.anomaly is true.
 */
export class SendAnomalyAlertUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly slackProvider: INotificationProvider = new SlackProvider(),
    private readonly discordProvider: INotificationProvider = new DiscordProvider(),
  ) {}

  async execute(params: SendAnomalyAlertParams): Promise<void> {
    const { organizationId, report: partialReport } = params;

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        slackWebhookUrl: true,
        discordWebhookUrl: true,
        notificationSettings: true,
      },
    });

    if (!org) return;

    const settings = parseNotificationSettings(org.notificationSettings);
    if (!settings.anomaly) return;

    const dashboardUrl = getDashboardUrl();
    
    // Montamos o report completo com os dados da organização
    const report: MultiCloudAnomalyReport = {
      ...partialReport,
      organizationName: org.name,
      dashboardUrl,
    };

    const locale = await getOwnerLocale(this.prisma, organizationId);

    const promises: Promise<void>[] = [];

    // O método nos providers agora deve ser sendAnomalyReport (ou adaptar o sendAnomalyAlert)
    if (org.slackWebhookUrl?.trim()) {
      promises.push(
        this.slackProvider.sendAnomalyAlert(org.slackWebhookUrl.trim(), report, locale).catch((err: Error) => {
          if (process.env.NODE_ENV !== "test") {
            console.error("[SendAnomalyAlert] Slack failed:", err);
          }
        }),
      );
    }

    if (org.discordWebhookUrl?.trim()) {
      promises.push(
        this.discordProvider.sendAnomalyAlert(org.discordWebhookUrl.trim(), report, locale).catch((err) => {
          if (process.env.NODE_ENV !== "test") {
            console.error("[SendAnomalyAlert] Discord failed:", err);
          }
        }),
      );
    }

    await Promise.allSettled(promises);
  }
}