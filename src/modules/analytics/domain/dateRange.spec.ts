import { describe, expect, it } from "vitest";

import { resolveDateRange } from "./dateRange";

describe("resolveDateRange", () => {
  const now = new Date(Date.UTC(2025, 1, 5, 12, 0, 0)); // 2025-02-05 noon UTC

  it("MTD: start is first of month, end is today", () => {
    const result = resolveDateRange("MTD", now);
    expect(result.start.toISOString().slice(0, 10)).toBe("2025-02-01");
    expect(result.end.toISOString().slice(0, 10)).toBe("2025-02-05");
    // Previous period: same number of days (5) ending day before start
    expect(result.previousStart.toISOString().slice(0, 10)).toBe("2025-01-27");
    expect(result.previousEnd.toISOString().slice(0, 10)).toBe("2025-01-31");
  });

  it("7D: 7 days including today", () => {
    const result = resolveDateRange("7D", now);
    expect(result.start.toISOString().slice(0, 10)).toBe("2025-01-30");
    expect(result.end.toISOString().slice(0, 10)).toBe("2025-02-05");
    const numDays =
      Math.round(
        (result.end.getTime() - result.start.getTime()) / (24 * 60 * 60 * 1000)
      ) + 1;
    expect(numDays).toBe(7);
  });

  it("30D: 30 days including today", () => {
    const result = resolveDateRange("30D", now);
    expect(result.start.toISOString().slice(0, 10)).toBe("2025-01-07");
    expect(result.end.toISOString().slice(0, 10)).toBe("2025-02-05");
    const numDays =
      Math.round(
        (result.end.getTime() - result.start.getTime()) / (24 * 60 * 60 * 1000)
      ) + 1;
    expect(numDays).toBe(30);
  });
});
