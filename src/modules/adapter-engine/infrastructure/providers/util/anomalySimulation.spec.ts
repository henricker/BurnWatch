import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  getAnomalySpikeMultiplier,
  getTodayDateString,
  isAnomalySimulationEnabled,
  isTodayDate,
} from "./anomalySimulation";

describe("anomalySimulation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isAnomalySimulationEnabled", () => {
    it("returns false when env is unset", () => {
      delete process.env.ANOMALY_AWS_ACTIVE;
      expect(isAnomalySimulationEnabled("AWS")).toBe(false);
      expect(isAnomalySimulationEnabled("GCP")).toBe(false);
      expect(isAnomalySimulationEnabled("VERCEL")).toBe(false);
    });

    it("returns true when env is 'true'", () => {
      process.env.ANOMALY_AWS_ACTIVE = "true";
      expect(isAnomalySimulationEnabled("AWS")).toBe(true);
      process.env.ANOMALY_GCP_ACTIVE = "true";
      expect(isAnomalySimulationEnabled("GCP")).toBe(true);
      process.env.ANOMALY_VERCEL_ACTIVE = "true";
      expect(isAnomalySimulationEnabled("VERCEL")).toBe(true);
    });

    it("returns true when env is '1'", () => {
      process.env.ANOMALY_AWS_ACTIVE = "1";
      expect(isAnomalySimulationEnabled("AWS")).toBe(true);
    });

    it("returns false for other values", () => {
      process.env.ANOMALY_AWS_ACTIVE = "false";
      expect(isAnomalySimulationEnabled("AWS")).toBe(false);
      process.env.ANOMALY_AWS_ACTIVE = "yes";
      expect(isAnomalySimulationEnabled("AWS")).toBe(false);
    });
  });

  describe("getAnomalySpikeMultiplier", () => {
    it("returns default 5 when unset", () => {
      delete process.env.ANOMALY_SPIKE_MULTIPLIER;
      expect(getAnomalySpikeMultiplier()).toBe(5);
    });

    it("returns parsed number when valid", () => {
      process.env.ANOMALY_SPIKE_MULTIPLIER = "6";
      expect(getAnomalySpikeMultiplier()).toBe(6);
      process.env.ANOMALY_SPIKE_MULTIPLIER = "10";
      expect(getAnomalySpikeMultiplier()).toBe(10);
    });

    it("returns default when invalid or < 1", () => {
      process.env.ANOMALY_SPIKE_MULTIPLIER = "0";
      expect(getAnomalySpikeMultiplier()).toBe(5);
      process.env.ANOMALY_SPIKE_MULTIPLIER = "abc";
      expect(getAnomalySpikeMultiplier()).toBe(5);
    });
  });

  describe("getTodayDateString", () => {
    it("returns YYYY-MM-DD format", () => {
      const s = getTodayDateString();
      expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("isTodayDate", () => {
    it("returns true when date string is today", () => {
      const today = getTodayDateString();
      expect(isTodayDate(today)).toBe(true);
      expect(isTodayDate(`${today}T00:00:00.000Z`)).toBe(true);
    });

    it("returns false when date string is not today", () => {
      expect(isTodayDate("2025-01-01")).toBe(false);
      expect(isTodayDate("1999-12-31")).toBe(false);
    });
  });
});
