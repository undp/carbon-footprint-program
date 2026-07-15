import { describe, expect, it } from "vitest";
import {
  MAX_EVENT_LOOP_DELAY_MS,
  MAX_EVENT_LOOP_UTILIZATION,
  parseNumericEnv,
} from "@/config/environment.js";

// parseNumericEnv backs the env-configurable @fastify/under-pressure thresholds
// (MAX_EVENT_LOOP_DELAY_MS / MAX_EVENT_LOOP_UTILIZATION). The key contract is
// that any malformed override falls back to the default rather than yielding a
// NaN/Infinity threshold that would silently disable load shedding.
describe("parseNumericEnv", () => {
  it("returns the fallback when the value is unset", () => {
    expect(parseNumericEnv(undefined, 300)).toBe(300);
  });

  it("returns the fallback for an empty or whitespace-only value", () => {
    expect(parseNumericEnv("", 300)).toBe(300);
    expect(parseNumericEnv("   ", 0.9)).toBe(0.9);
  });

  it("returns the fallback for a non-numeric value", () => {
    expect(parseNumericEnv("fast", 300)).toBe(300);
    expect(parseNumericEnv("300ms", 300)).toBe(300);
  });

  it("returns the fallback for non-finite values", () => {
    expect(parseNumericEnv("Infinity", 300)).toBe(300);
    expect(parseNumericEnv("NaN", 0.9)).toBe(0.9);
  });

  it("parses a valid integer override", () => {
    expect(parseNumericEnv("500", 300)).toBe(500);
    expect(parseNumericEnv("  500  ", 300)).toBe(500);
  });

  it("parses a valid fractional override", () => {
    expect(parseNumericEnv("0.75", 0.9)).toBe(0.75);
  });

  it("preserves an explicit zero (does not treat it as unset)", () => {
    expect(parseNumericEnv("0", 300)).toBe(0);
  });
});

// Acceptance criterion: with no env override set (the Vitest env sets neither
// variable), the exported thresholds must equal today's hardcoded production
// defaults.
describe("under-pressure thresholds — default behaviour", () => {
  it("defaults MAX_EVENT_LOOP_DELAY_MS to 300", () => {
    expect(MAX_EVENT_LOOP_DELAY_MS).toBe(300);
  });

  it("defaults MAX_EVENT_LOOP_UTILIZATION to 0.9", () => {
    expect(MAX_EVENT_LOOP_UTILIZATION).toBe(0.9);
  });
});
