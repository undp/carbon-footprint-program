import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import { autoConfig } from "@/plugins/external/under-pressure.js";

// `autoConfig` is computed at module load from the env-derived thresholds in
// config/environment.ts. These tests lock down that wiring — the seam this
// change introduced — without exercising the library's actual 503 load
// shedding: it is intentionally disabled under test (skipUnderPressure + the
// NODE_ENV==="test" guard) and would be timing-flaky to drive (the reason #276
// opted out in the first place).
describe("under-pressure autoConfig wiring", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses the production defaults when the env vars are unset", () => {
    // The Vitest env sets neither MAX_EVENT_LOOP_* var, so autoConfig must carry
    // today's hardcoded production thresholds.
    expect(autoConfig.maxEventLoopDelay).toBe(300);
    expect(autoConfig.maxEventLoopUtilization).toBe(0.9);
  });

  it("maps the env-configurable thresholds onto the matching fastify options", async () => {
    // Set the overrides, drop the cached modules, and re-import so the
    // module-level reads in config/environment.ts pick up the new values. This
    // guards the full path: env var name → parseNumericEnv → autoConfig key.
    vi.stubEnv("MAX_EVENT_LOOP_DELAY_MS", "500");
    vi.stubEnv("MAX_EVENT_LOOP_UTILIZATION", "0.75");
    vi.resetModules();

    const { autoConfig: overridden } =
      await import("@/plugins/external/under-pressure.js");

    expect(overridden.maxEventLoopDelay).toBe(500);
    expect(overridden.maxEventLoopUtilization).toBe(0.75);
  });
});

// The plugin function gates on NODE_ENV: it registers @fastify/under-pressure
// everywhere EXCEPT the test environment, where it early-returns (the serialized
// suite would otherwise trip its 503 guard — the reason #276 opted out). The
// full suite always runs with NODE_ENV=test and createApp skips the plugin, so
// neither leg of that guard runs during integration — drive both here.
describe("under-pressure plugin - environment guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("early-returns without registering the library under NODE_ENV=test", async () => {
    const { default: underPressurePlugin } =
      await import("@/plugins/external/under-pressure.js");
    const app = Fastify();
    try {
      await app.register(underPressurePlugin);
      await app.ready();
      // @fastify/under-pressure decorates `memoryUsage` when it registers.
      expect(app.hasDecorator("memoryUsage")).toBe(false);
    } finally {
      await app.close();
    }
  });

  it("registers @fastify/under-pressure outside the test environment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    // Re-parsing the env under prod would otherwise trip the fail-closed CORS
    // guard; set a valid origin so this test can focus on the NODE_ENV gate.
    vi.stubEnv("ALLOWED_ORIGIN", "https://app.example.cl");
    const { default: underPressurePlugin } =
      await import("@/plugins/external/under-pressure.js");
    const app = Fastify();
    try {
      await app.register(underPressurePlugin);
      await app.ready();
      expect(app.hasDecorator("memoryUsage")).toBe(true);
    } finally {
      await app.close();
    }
  });
});
