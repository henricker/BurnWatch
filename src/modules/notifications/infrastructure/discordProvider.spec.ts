import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiscordProvider } from "./discordProvider";
import type { MultiCloudAnomalyReport } from "../domain/types";

function minimalReport(overrides?: Partial<MultiCloudAnomalyReport>): MultiCloudAnomalyReport {
  return {
    organizationName: "Acme",
    dashboardUrl: "https://app.example.com/dashboard",
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

describe("DiscordProvider", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sendAnomalyAlert sends embed with color, title, description, provider fields, footer and timestamp", async () => {
    const provider = new DiscordProvider();
    const report = minimalReport();

    await provider.sendAnomalyAlert("https://discord.com/api/webhooks/123/abc", report);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://discord.com/api/webhooks/123/abc");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(options.body as string);
    expect(body.embeds).toBeDefined();
    expect(body.embeds.length).toBe(1);
    const embed = body.embeds[0];
    expect(embed.title).toBeDefined();
    expect(embed.title).toMatch(/ANOMALY|ANOMALIA|COSTE|Spike/i);
    expect(typeof embed.color).toBe("number");
    expect(embed.description).toContain("Acme");
    expect(embed.description).toContain("125.40");
    expect(embed.fields).toBeDefined();
    expect(embed.fields.length).toBeGreaterThanOrEqual(1);
    expect(embed.footer).toBeDefined();
    expect(embed.timestamp).toBeDefined();
    expect(embed.url).toBe(report.dashboardUrl);
    const awsField = embed.fields.find((f: { name: string }) => f.name?.includes("AWS"));
    expect(awsField).toBeDefined();
    expect(awsField.value).toContain("CloudFront");
    expect(awsField.value).toContain("125.40");
  });

  it("sendTestMessage sends embed with blurple color", async () => {
    const provider = new DiscordProvider();
    await provider.sendTestMessage("https://discord.com/api/webhooks/456/def", "My Org");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.embeds).toBeDefined();
    expect(body.embeds[0].title).toBeDefined();
    expect(body.embeds[0].description).toContain("My Org");
    expect(body.embeds[0].timestamp).toBeDefined();
  });

  it("throws when response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve("Unknown Webhook") });
    const provider = new DiscordProvider();
    await expect(
      provider.sendAnomalyAlert("https://discord.com/api/webhooks/bad", minimalReport()),
    ).rejects.toThrow("Discord webhook failed");
  });
});
