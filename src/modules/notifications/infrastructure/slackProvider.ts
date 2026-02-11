import type { INotificationProvider } from "../domain/notificationProvider";
import type { MultiCloudAnomalyReport, ProviderAnomalyGroup, ServiceAnomaly } from "../domain/types";
import {
  getNotificationMessages,
  type NotificationLocale,
} from "../domain/notificationMessages";

/**
 * Slack Incoming Webhooks: POST JSON with optional Block Kit "blocks" array.
 * @see https://api.slack.com/messaging/webhooks
 * @see https://api.slack.com/block-kit/building
 */
export class SlackProvider implements INotificationProvider {
  async sendAnomalyAlert(
    webhookUrl: string,
    report: MultiCloudAnomalyReport,
    locale?: NotificationLocale | null,
  ): Promise<void> {
    const msg = getNotificationMessages(locale ?? undefined).slack;
    const totalImpact = this.formatCents(report.totalImpactCents);
    const descriptionText = msg.anomalyDescriptionConsolidated
      .replace("{organizationName}", report.organizationName)
      .replace("{totalImpact}", totalImpact);

    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🚨 ${msg.anomalyTitle}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: descriptionText,
        },
      },
    ];

    // Adicionar contexto de Budget se disponível
    if (report.budgetUsedPercent !== undefined && report.totalMTDCents !== undefined) {
      const mtdFormatted = this.formatCents(report.totalMTDCents);
      const budgetFormatted = report.budgetLimitCents ? this.formatCents(report.budgetLimitCents) : "N/A";
      const budgetLine = msg.budgetSpendLine
        .replace("{mtd}", mtdFormatted)
        .replace("{budget}", budgetFormatted)
        .replace("{percent}", String(report.budgetUsedPercent));
      blocks.push({
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*💰 ${msg.monthlyContextLabel}*\n${budgetLine}` },
          { type: "mrkdwn", text: `*${msg.consumedLabel}*\n${report.budgetUsedPercent}%` }
        ]
      });
    }

    blocks.push({ type: "divider" });

    // Iterar sobre provedores e serviços
    Object.entries(report.providers).forEach(([providerName, group]: [string, ProviderAnomalyGroup]) => {
      let servicesText = "";
      
      group.services.forEach((service: ServiceAnomaly) => {
        const spend = this.formatCents(service.currentSpend);
        const spike = `+${service.spikePercent}%`;
        servicesText += `• *${service.name}*: ${spend} (${spike})\n`;
      });

      if (servicesText) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${this.getProviderEmoji(providerName)} ${providerName}*\n${servicesText}`
          }
        });
      }
    });

    blocks.push(
      { type: "divider" },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: msg.openDashboard, emoji: true },
            url: report.dashboardUrl,
            action_id: "open_dashboard",
            style: "danger" // Botão vermelho para chamar atenção
          },
        ],
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: msg.anomalyFooter }],
      }
    );

    await this.postToSlack(webhookUrl, { blocks });
  }

  async sendTestMessage(
    webhookUrl: string,
    organizationName?: string,
    locale?: NotificationLocale | null,
  ): Promise<void> {
    const msg = getNotificationMessages(locale ?? undefined).slack;
    const orgLine = organizationName ? `\n${msg.testOrgLabel}: _${organizationName}_` : "";
    const text = `✅ *BurnWatch* – ${msg.testVerified}${orgLine}`;

    const payload = {
      blocks: [
        { type: "section", text: { type: "mrkdwn", text } },
        { type: "context", elements: [{ type: "mrkdwn", text: msg.testContext }] },
      ],
    };

    await this.postToSlack(webhookUrl, payload);
  }

  private async postToSlack(url: string, payload: any) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Slack webhook failed: ${res.status} ${body}`);
      throw new Error(`Slack webhook failed: ${res.status} ${body}`);
    }
  }

  private formatCents(cents: number): string {
    const value = (cents / 100).toFixed(2);
    return `$${value}`;
  }

  private getProviderEmoji(provider: string): string {
    const p = provider.toUpperCase();
    if (p === "AWS") return "🟠"; // Círculo laranja para AWS
    if (p === "VERCEL") return "▲"; // Triângulo para Vercel (aproximação)
    if (p === "GCP") return "🔵"; // Círculo azul para GCP
    return "☁️";
  }
}