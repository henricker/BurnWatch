import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { SendAnomalyAlertUseCase } from "./index";
import type { MultiCloudAnomalyReport } from "../../../domain/types";

function minimalReport(overrides?: Partial<Omit<MultiCloudAnomalyReport, "organizationName" | "dashboardUrl">>) {
  return {
    totalImpactCents: 12540,
    providers: {
      AWS: {
        services: [
          {
            name: "CloudFront",
            currentSpend: 12540,
            averageSpend: 2210,
            spikePercent: 467,
            zScore: 2.5,
          },
        ],
        providerTotal: 12540,
      },
    },
    ...overrides,
  };
}

describe("SendAnomalyAlertUseCase", () => {
  const mockPrisma = {
    organization: { findUnique: vi.fn() },
    profile: { findFirst: vi.fn().mockResolvedValue({ locale: "en" }) },
  } as unknown as PrismaClient;

  const mockSlack = {
    sendAnomalyAlert: vi.fn().mockResolvedValue(undefined),
    sendTestMessage: vi.fn(),
  };

  const mockDiscord = {
    sendAnomalyAlert: vi.fn().mockResolvedValue(undefined),
    sendTestMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (mockPrisma.organization.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "Acme",
      slackWebhookUrl: "https://hooks.slack.com/services/xxx",
      discordWebhookUrl: "https://discord.com/api/webhooks/yyy/zzz",
      notificationSettings: { anomaly: true },
    });
  });

  it("sends to Slack and Discord when both URLs are set and anomaly is enabled", async () => {
    const useCase = new SendAnomalyAlertUseCase(mockPrisma, mockSlack, mockDiscord);
    const report = minimalReport();

    await useCase.execute({
      organizationId: "org-1",
      report,
    });

    expect(mockSlack.sendAnomalyAlert).toHaveBeenCalledTimes(1);
    expect(mockSlack.sendAnomalyAlert).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/xxx",
      expect.objectContaining({
        organizationName: "Acme",
        dashboardUrl: expect.any(String),
        totalImpactCents: 12540,
        providers: report.providers,
      }),
      "en",
    );
    expect(mockDiscord.sendAnomalyAlert).toHaveBeenCalledTimes(1);
    expect(mockDiscord.sendAnomalyAlert).toHaveBeenCalledWith(
      "https://discord.com/api/webhooks/yyy/zzz",
      expect.objectContaining({
        organizationName: "Acme",
        totalImpactCents: 12540,
        providers: report.providers,
      }),
      "en",
    );
  });

  it("does not send when organization has anomaly disabled", async () => {
    (mockPrisma.organization.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "Acme",
      slackWebhookUrl: "https://hooks.slack.com/services/xxx",
      discordWebhookUrl: null,
      notificationSettings: { anomaly: false },
    });

    const useCase = new SendAnomalyAlertUseCase(mockPrisma, mockSlack, mockDiscord);
    await useCase.execute({
      organizationId: "org-1",
      report: minimalReport(),
    });

    expect(mockSlack.sendAnomalyAlert).not.toHaveBeenCalled();
    expect(mockDiscord.sendAnomalyAlert).not.toHaveBeenCalled();
  });

  it("sends only to Slack when Discord URL is missing", async () => {
    (mockPrisma.organization.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "Acme",
      slackWebhookUrl: "https://hooks.slack.com/services/xxx",
      discordWebhookUrl: null,
      notificationSettings: { anomaly: true },
    });

    const useCase = new SendAnomalyAlertUseCase(mockPrisma, mockSlack, mockDiscord);
    await useCase.execute({
      organizationId: "org-1",
      report: minimalReport(),
    });

    expect(mockSlack.sendAnomalyAlert).toHaveBeenCalledTimes(1);
    expect(mockDiscord.sendAnomalyAlert).not.toHaveBeenCalled();
  });

  it("does nothing when organization is not found", async () => {
    (mockPrisma.organization.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const useCase = new SendAnomalyAlertUseCase(mockPrisma, mockSlack, mockDiscord);
    await useCase.execute({
      organizationId: "org-missing",
      report: minimalReport(),
    });
    expect(mockSlack.sendAnomalyAlert).not.toHaveBeenCalled();
    expect(mockDiscord.sendAnomalyAlert).not.toHaveBeenCalled();
  });
});
