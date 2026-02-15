import { describe, it, expect, vi, beforeEach } from "vitest";
import { SlackProvider } from "./slackProvider";
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

describe("SlackProvider", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sendAnomalyAlert sends Block Kit payload with header, impact and provider sections", async () => {
    const provider = new SlackProvider();
    const report = minimalReport();

    await provider.sendAnomalyAlert("https://hooks.slack.com/services/xxx", report);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.slack.com/services/xxx");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body as string);
    expect(body.blocks).toBeDefined();
    expect(Array.isArray(body.blocks)).toBe(true);

    const header = body.blocks.find((b: { type: string }) => b.type === "header");
    expect(header).toBeDefined();
    expect(header.text.text).toMatch(/Spike|anomal|detect/i);

    const sectionWithOrg = body.blocks.find(
      (b: { type: string; text?: { text: string } }) =>
        b.type === "section" && b.text?.text?.includes("Acme"),
    );
    expect(sectionWithOrg).toBeDefined();
    expect(sectionWithOrg.text.text).toContain("125.40");

    const actions = body.blocks.find((b: { type: string }) => b.type === "actions");
    expect(actions).toBeDefined();
    expect(actions.elements[0].url).toBe(report.dashboardUrl);
    expect(actions.elements[0].style).toBe("danger");

    const context = body.blocks.find((b: { type: string }) => b.type === "context");
    expect(context).toBeDefined();
    expect(context.elements[0].text).toContain("BurnWatch");
  });

  it("sendAnomalyAlert includes budget section when totalMTDCents and budgetUsedPercent are set", async () => {
    const provider = new SlackProvider();
    const report = minimalReport({
      totalMTDCents: 45000,
      budgetLimitCents: 60000,
      budgetUsedPercent: 75,
    });

    await provider.sendAnomalyAlert("https://hooks.slack.com/services/yyy", report);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const budgetSection = body.blocks.find(
      (b: { type: string; fields?: unknown[] }) => b.type === "section" && b.fields?.length === 2,
    );
    expect(budgetSection).toBeDefined();
    const fieldsText = budgetSection.fields.map((f: { text: string }) => f.text).join(" ");
    expect(fieldsText).toContain("450.00");
    expect(fieldsText).toContain("600.00");
    expect(fieldsText).toContain("75%");
  });

  it("sendAnomalyAlert renders provider emoji and service list per provider", async () => {
    const provider = new SlackProvider();
    const report = minimalReport({
      providers: {
        AWS: {
          services: [
            { name: "S3", currentSpend: 5000, averageSpend: 1000, spikePercent: 400, zScore: 2.1 },
            { name: "Lambda", currentSpend: 3000, averageSpend: 800, spikePercent: 275, zScore: 2.0 },
          ],
          providerTotal: 8000,
        },
        GCP: {
          services: [{ name: "BigQuery", currentSpend: 2000, averageSpend: 500, spikePercent: 300, zScore: 2.2 }],
          providerTotal: 2000,
        },
      },
    });

    await provider.sendAnomalyAlert("https://hooks.slack.com/services/zzz", report);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const sections = body.blocks.filter((b: { type: string }) => b.type === "section");
    const providerSectionTexts = sections
      .filter((s: { text?: { text: string } }) => s.text?.text)
      .map((s: { text: { text: string } }) => s.text.text);
    expect(providerSectionTexts.some((t: string) => t.includes("AWS") && t.includes("S3") && t.includes("Lambda"))).toBe(true);
    expect(providerSectionTexts.some((t: string) => t.includes("GCP") && t.includes("BigQuery"))).toBe(true);
  });

  it("sendTestMessage sends blocks with BurnWatch text", async () => {
    const provider = new SlackProvider();
    await provider.sendTestMessage("https://hooks.slack.com/test", "My Org");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.blocks).toBeDefined();
    const section = body.blocks.find((b: { type: string }) => b.type === "section");
    expect(section?.text?.text).toContain("BurnWatch");
  });

  it("throws when response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: () => Promise.resolve("invalid") });
    const provider = new SlackProvider();
    await expect(
      provider.sendAnomalyAlert("https://hooks.slack.com/bad", minimalReport()),
    ).rejects.toThrow("Slack webhook failed");
  });
});
