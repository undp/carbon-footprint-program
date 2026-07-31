import { describe, expect, it, vi } from "vitest";
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
    for (const configured of [true, 1, 0, "10.0.0.0/8", "loopback"]) {
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
