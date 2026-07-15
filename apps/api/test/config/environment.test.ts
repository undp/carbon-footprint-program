import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_EVENT_LOOP_DELAY_MS,
  MAX_EVENT_LOOP_UTILIZATION,
} from "@/config/environment.js";

// The @fastify/under-pressure thresholds are env-configurable
// (MAX_EVENT_LOOP_DELAY_MS / MAX_EVENT_LOOP_UTILIZATION). These tests pin the
// two guarantees that matter through the module's PUBLIC surface (the exported
// constants), not the private parsing helper: the defaults preserve today's
// production behaviour, and a malformed override falls back to the default
// instead of producing a NaN/Infinity threshold that would silently disable
// load shedding.

// Stub the env vars, drop the cached module, and re-import so the module-level
// reads in config/environment.ts pick up the stubbed values.
const importWithEnv = async (env: Record<string, string>) => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.resetModules();
  return import("@/config/environment.js");
};

describe("under-pressure thresholds — defaults", () => {
  it("preserve today's production values when the env vars are unset", () => {
    // The Vitest env sets neither variable, so the statically imported values
    // must equal the hardcoded production defaults.
    expect(MAX_EVENT_LOOP_DELAY_MS).toBe(300);
    expect(MAX_EVENT_LOOP_UTILIZATION).toBe(0.9);
  });
});

describe("under-pressure thresholds — env overrides", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("apply a valid numeric override", async () => {
    const env = await importWithEnv({
      MAX_EVENT_LOOP_DELAY_MS: "500",
      MAX_EVENT_LOOP_UTILIZATION: "0.75",
    });
    expect(env.MAX_EVENT_LOOP_DELAY_MS).toBe(500);
    expect(env.MAX_EVENT_LOOP_UTILIZATION).toBe(0.75);
  });

  it("fall back to the default for a non-numeric value", async () => {
    const env = await importWithEnv({
      MAX_EVENT_LOOP_DELAY_MS: "fast",
      MAX_EVENT_LOOP_UTILIZATION: "high",
    });
    expect(env.MAX_EVENT_LOOP_DELAY_MS).toBe(300);
    expect(env.MAX_EVENT_LOOP_UTILIZATION).toBe(0.9);
  });

  it("fall back to the default for an empty or non-finite value", async () => {
    const env = await importWithEnv({
      MAX_EVENT_LOOP_DELAY_MS: "   ",
      MAX_EVENT_LOOP_UTILIZATION: "Infinity",
    });
    expect(env.MAX_EVENT_LOOP_DELAY_MS).toBe(300);
    expect(env.MAX_EVENT_LOOP_UTILIZATION).toBe(0.9);
  });
});
