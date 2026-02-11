import type { PrismaClient } from "@prisma/client";

import type { INotificationProvider } from "../../../domain/notificationProvider";
import { getOwnerLocale } from "../../../domain/get-owner-locale";
import { SlackProvider } from "../../../infrastructure/slackProvider";
import { DiscordProvider } from "../../../infrastructure/discordProvider";

export type WebhookChannel = "slack" | "discord";

export interface TestWebhookConnectionParams {
  organizationId: string;
  channel: WebhookChannel;
  /** If provided, test this URL (e.g. from input before saving). Otherwise use saved URL from org. */
  webhookUrl?: string;
}

export interface TestWebhookConnectionResult {
  ok: boolean;
  error?: string;
}

/**
 * Sends a test message ("Hello World" / connection verified) to the configured webhook for the given channel.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 */
export class TestWebhookConnectionUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly slackProvider: INotificationProvider = new SlackProvider(),
    private readonly discordProvider: INotificationProvider = new DiscordProvider(),
  ) {}

  async execute(params: TestWebhookConnectionParams): Promise<TestWebhookConnectionResult> {
    const { organizationId, channel, webhookUrl: urlFromInput } = params;

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, slackWebhookUrl: true, discordWebhookUrl: true },
    });

    if (!org) {
      return { ok: false, error: "Organization not found" };
    }

    const urlToTest =
      urlFromInput?.trim() ??
      (channel === "slack" ? org.slackWebhookUrl : org.discordWebhookUrl);

    if (!urlToTest?.trim()) {
      return {
        ok: false,
        error: channel === "slack" ? "Slack webhook URL not configured" : "Discord webhook URL not configured",
      };
    }

    const provider = channel === "slack" ? this.slackProvider : this.discordProvider;
    const locale = await getOwnerLocale(this.prisma, organizationId);

    try {
      await provider.sendTestMessage(urlToTest.trim(), org.name, locale);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { ok: false, error: message };
    }
  }
}
