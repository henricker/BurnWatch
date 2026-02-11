import type { INotificationProvider } from "../domain/notificationProvider";
import type { MultiCloudAnomalyReport, ServiceAnomaly, ProviderAnomalyGroup } from "../domain/types";
import {
  getNotificationMessages,
  type NotificationLocale,
} from "../domain/notificationMessages";

/**
 * Discord Webhooks: POST JSON with "embeds" array.
 * Color is decimal (not hex). Red = 0xED4245 = 15548997 for anomaly.
 * @see https://discord.com/developers/docs/resources/webhook#execute-webhook
 */
const ANOMALY_COLOR = 0xed4245; // red
const TEST_COLOR = 0x5865f2; // Discord blurple

export class DiscordProvider implements INotificationProvider {
  async sendAnomalyAlert(
    webhookUrl: string,
    report: MultiCloudAnomalyReport,
    locale?: NotificationLocale | null,
  ): Promise<void> {
    const msg = getNotificationMessages(locale ?? undefined).discord;
    
    // Construir campos dinâmicos baseados nos provedores
    const fields = [];

    // Adicionar contexto de Budget se disponível
    if (report.budgetUsedPercent !== undefined && report.totalMTDCents !== undefined) {
      const mtdFormatted = this.formatCents(report.totalMTDCents);
      const budgetFormatted = report.budgetLimitCents ? this.formatCents(report.budgetLimitCents) : "N/A";
      const budgetLine = msg.budgetSpendLine
        .replace("{mtd}", mtdFormatted)
        .replace("{budget}", budgetFormatted)
        .replace("{percent}", String(report.budgetUsedPercent));
      fields.push({
        name: `💰 ${msg.monthlyContextLabel}`,
        value: budgetLine,
        inline: false
      });
    }

    // Iterar sobre provedores e serviços
    Object.entries(report.providers).forEach(([providerName, group]: [string, ProviderAnomalyGroup]) => {
      let servicesText = "";
      
      group.services.forEach((service: ServiceAnomaly) => {
        const spend = this.formatCents(service.currentSpend);
        const spike = `+${service.spikePercent}%`;
        servicesText += `• **${service.name}**: ${spend} (${spike})\n`;
      });

      if (servicesText) {
        fields.push({
          name: `${this.getProviderEmoji(providerName)} ${providerName}`,
          value: servicesText,
          inline: false
        });
      }
    });

    const totalImpact = this.formatCents(report.totalImpactCents);
    const description = msg.anomalyDescriptionConsolidated
      .replace("{organizationName}", report.organizationName)
      .replace("{totalImpact}", totalImpact);

    const payload = {
      embeds: [
        {
          title: `🚨 ${msg.anomalyTitle}`,
          description,
          color: ANOMALY_COLOR,
          fields: fields,
          footer: { text: msg.anomalyFooter },
          timestamp: new Date().toISOString(),
          url: report.dashboardUrl,
        },
      ],
    };

    await this.postToDiscord(webhookUrl, payload);
  }

  async sendTestMessage(
    webhookUrl: string,
    organizationName?: string,
    locale?: NotificationLocale | null,
  ): Promise<void> {
    const msg = getNotificationMessages(locale ?? undefined).discord;
    const orgLine = organizationName ? `\n\n${msg.testOrgLabel}: **${organizationName}**` : "";
    const description = `BurnWatch – ${msg.testDescription}${orgLine}`;

    const payload = {
      embeds: [
        {
          title: msg.testTitle,
          description,
          color: TEST_COLOR,
          footer: { text: msg.testFooter },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await this.postToDiscord(webhookUrl, payload);
  }

  private formatCents(cents: number): string {
    const value = (cents / 100).toFixed(2);
    return `$${value}`;
  }

  private getProviderEmoji(provider: string): string {
    const p = provider.toUpperCase();
    if (p === "AWS") return "🟠";
    if (p === "VERCEL") return "▲";
    if (p === "GCP") return "🔵";
    return "☁️";
  }

  private async postToDiscord(url: string, payload: any) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Discord webhook failed: ${res.status} ${body}`);
      throw new Error(`Discord webhook failed: ${res.status} ${body}`);
    }
  }
}
