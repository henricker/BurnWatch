import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { TestWebhookConnectionUseCase } from "./index";

describe("TestWebhookConnectionUseCase", () => {
  const mockPrisma = {
    organization: { findUnique: vi.fn() },
    profile: { findFirst: vi.fn().mockResolvedValue({ locale: "en" }) },
  } as unknown as PrismaClient;

  const mockSlack = {
    sendTestMessage: vi.fn().mockResolvedValue(undefined),
    sendAnomalyAlert: vi.fn(),
  };

  const mockDiscord = {
    sendTestMessage: vi.fn().mockResolvedValue(undefined),
    sendAnomalyAlert: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (mockPrisma.organization.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "Acme",
      slackWebhookUrl: "https://hooks.slack.com/services/T00/B00/xxx",
      discordWebhookUrl: "https://discord.com/api/webhooks/123/yyy",
    });
  });

  it("sends test message to Slack and returns ok", async () => {
    const useCase = new TestWebhookConnectionUseCase(mockPrisma, mockSlack, mockDiscord);
    const result = await useCase.execute({ organizationId: "org-1", channel: "slack" });
    expect(result).toEqual({ ok: true });
    expect(mockSlack.sendTestMessage).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/T00/B00/xxx",
      "Acme",
      "en",
    );
  });

  it("returns error when Slack URL is not configured", async () => {
    (mockPrisma.organization.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "Acme",
      slackWebhookUrl: null,
      discordWebhookUrl: "https://discord.com/api/webhooks/123/yyy",
    });
    const useCase = new TestWebhookConnectionUseCase(mockPrisma, mockSlack, mockDiscord);
    const result = await useCase.execute({ organizationId: "org-1", channel: "slack" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Slack webhook");
  });

  it("returns error when organization is not found", async () => {
    (mockPrisma.organization.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const useCase = new TestWebhookConnectionUseCase(mockPrisma, mockSlack, mockDiscord);
    const result = await useCase.execute({ organizationId: "org-missing", channel: "slack" });
    expect(result).toEqual({ ok: false, error: "Organization not found" });
  });

  it("uses webhookUrl from params when provided (test before save)", async () => {
    const useCase = new TestWebhookConnectionUseCase(mockPrisma, mockSlack, mockDiscord);
    const customUrl = "https://hooks.slack.com/services/CUSTOM/NEW/url";
    const result = await useCase.execute({
      organizationId: "org-1",
      channel: "slack",
      webhookUrl: customUrl,
    });
    expect(result).toEqual({ ok: true });
    expect(mockSlack.sendTestMessage).toHaveBeenCalledWith(customUrl, "Acme", "en");
  });
});
