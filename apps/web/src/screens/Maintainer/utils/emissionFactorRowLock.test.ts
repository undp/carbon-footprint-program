import { describe, expect, it } from "vitest";

import { resolveEmissionFactorRowLock } from "./emissionFactorRowLock";

describe("resolveEmissionFactorRowLock", () => {
  it("locks every row while the screen cannot write", () => {
    expect(resolveEmissionFactorRowLock(false, 0)).toEqual({ canEdit: false });
  });

  it("gives no reason when the screen itself is read-only", () => {
    // The screen already says so in its subtitle; a per-row tooltip repeating
    // it on every cell would be noise.
    expect(resolveEmissionFactorRowLock(false, 4).reason).toBeUndefined();
  });

  it("allows a factor no line references", () => {
    expect(resolveEmissionFactorRowLock(true, 0)).toEqual({ canEdit: true });
  });

  it("allows a row the listing does not know about yet", () => {
    expect(resolveEmissionFactorRowLock(true, undefined)).toEqual({
      canEdit: true,
    });
  });

  it("locks a factor in use and names the count", () => {
    const lock = resolveEmissionFactorRowLock(true, 3);

    expect(lock.canEdit).toBe(false);
    expect(lock.reason).toContain("3 líneas");
  });

  it("says línea in the singular for one line", () => {
    expect(resolveEmissionFactorRowLock(true, 1).reason).toContain("1 línea ");
  });
});
