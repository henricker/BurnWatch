import type { AnomalyAlert, MultiCloudAnomalyReport } from "./types";
import type { NotificationLocale } from "./notificationMessages";

/**
 * Contract for sending notifications to a channel (Slack, Discord).
 * Implementations perform HTTP POST to webhook URLs.
 * Locale is the organization OWNER's preferred language for the message copy.
 */
export interface INotificationProvider {
  /**
   * Send an anomaly (spike) alert. Returns when the request completes (success or failure).
   */
  sendAnomalyAlert(webhookUrl: string, report: MultiCloudAnomalyReport, locale?: NotificationLocale | null): Promise<void>;

  /**
   * Send a test message to validate the webhook.
   */
  sendTestMessage(webhookUrl: string, organizationName?: string, locale?: NotificationLocale | null): Promise<void>;
}
