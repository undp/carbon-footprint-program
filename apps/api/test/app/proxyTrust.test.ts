import { afterEach, describe, expect, it, vi } from "vitest";
import { warnIfProxyTrustUnconfigured } from "@/app.js";

// The boot warning has to fire for "nobody configured this" and stay silent for
// "configured to trust nothing" — two states that look identical at runtime,
// because app.ts applies `?? false` to both. A reviewer has already read the
// code as warning on explicit false, so the distinction is pinned here rather
// than left to the comment beside it.

const spyLog = () => ({ warn: vi.fn() });

describe("warnIfProxyTrustUnconfigured", () => {
  it("warns in production when TRUST_PROXY was never configured", () => {
    const log = spyLog();
    warnIfProxyTrustUnconfigured(log, true, undefined);

    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0][0]).toMatch(/TRUST_PROXY is not configured/);
    // The message has to name the way out, or it is just noise.
    expect(log.warn.mock.calls[0][0]).toMatch(/false explicitly/);
  });

  it("stays silent on an explicit false — the decision was made", () => {
    // The false positive this guards. A directly-reached deployment that
    // correctly wrote TRUST_PROXY=false must not be warned at on every boot.
    const log = spyLog();
    warnIfProxyTrustUnconfigured(log, true, false);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("stays silent for every configured value", () => {
    for (const configured of [true, false, "10.0.0.0/8", "loopback"]) {
      const log = spyLog();
      warnIfProxyTrustUnconfigured(log, true, configured);
      expect(
        log.warn,
        `expected silence for ${String(configured)}`
      ).not.toHaveBeenCalled();
    }
  });

  it("stays silent outside production even when unconfigured", () => {
    // Local dev reaches the API directly, so the warning would fire on every
    // `pnpm dev` for a condition that is correct there.
    const log = spyLog();
    warnIfProxyTrustUnconfigured(log, false, undefined);
    expect(log.warn).not.toHaveBeenCalled();
  });
});

// The env-to-constructor wiring. Fastify consumes `trustProxy` in
// Request.buildRequest and never surfaces it — it is absent from
// `app.initialConfig` — so a built server cannot be asked what it was given.
// Without these, deleting the option from the constructor leaves the whole
// suite green while the feature is gone: the bucketing tests below construct
// their own Fastify with an explicit trustProxy and would not notice.
describe("getServerOptions — trustProxy wiring", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("passes an unconfigured TRUST_PROXY through as false", async () => {
    // The suite runs with TRUST_PROXY unset, so this is the default path.
    const { getServerOptions } = await import("@/app.js");
    expect(getServerOptions().trustProxy).toBe(false);
  });

  it("carries a configured allowlist through to the constructor options", async () => {
    vi.stubEnv("TRUST_PROXY", "10.0.0.0/8");
    vi.resetModules();

    const { getServerOptions } = await import("@/app.js");
    expect(getServerOptions().trustProxy).toBe("10.0.0.0/8");
  });

  it("refuses to load at all when TRUST_PROXY is a hop count", async () => {
    // The end-to-end half of the hop-count rejection: environment.ts parses
    // process.env at module scope, so importing the app is what a boot does.
    // Asserted here rather than only against parseEnv because the failure has
    // to reach the process — a hop count that merely warned would leave the
    // deployment serving traffic with the rate limiter on one shared bucket.
    vi.stubEnv("TRUST_PROXY", "1");
    vi.resetModules();

    await expect(import("@/app.js")).rejects.toThrow(
      /Hop counts are no longer supported/
    );
  });

  it("distinguishes an explicit false from unset at the constructor too", async () => {
    vi.stubEnv("TRUST_PROXY", "false");
    vi.resetModules();

    const { getServerOptions } = await import("@/app.js");
    expect(getServerOptions().trustProxy).toBe(false);
  });
});
