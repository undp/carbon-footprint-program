import { afterEach, describe, expect, it, vi } from "vitest";
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
