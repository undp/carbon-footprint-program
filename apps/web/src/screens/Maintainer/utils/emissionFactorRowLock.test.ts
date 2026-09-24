import { describe, expect, it } from "vitest";

import {
  resolveEmissionFactorDeleteMessage,
  resolveEmissionFactorRowLock,
} from "./emissionFactorRowLock";

describe("resolveEmissionFactorRowLock", () => {
  it("locks every row while the screen cannot write", () => {
    expect(resolveEmissionFactorRowLock(false, 0, 0)).toEqual({
      canEdit: false,
      unclaimedReferencedLineCount: 0,
    });
  });

  it("gives no reason when the screen itself is read-only", () => {
    // The screen already says so in its subtitle; a per-row tooltip repeating
    // it on every cell would be noise.
    expect(resolveEmissionFactorRowLock(false, 4, 0).reason).toBeUndefined();
  });

  it("allows a factor no line references", () => {
    expect(resolveEmissionFactorRowLock(true, 0, 0)).toEqual({
      canEdit: true,
      unclaimedReferencedLineCount: 0,
    });
  });

  it("allows a row the listing does not know about yet", () => {
    expect(resolveEmissionFactorRowLock(true, undefined, undefined)).toEqual({
      canEdit: true,
      unclaimedReferencedLineCount: 0,
    });
  });

  it("locks a factor in use and names the count", () => {
    const lock = resolveEmissionFactorRowLock(true, 3, 0);

    expect(lock.canEdit).toBe(false);
    expect(lock.reason).toContain("3 fuentes de emisión");
  });

  it("names a single emission source in the singular", () => {
    expect(resolveEmissionFactorRowLock(true, 1, 0).reason).toContain(
      "1 fuente de emisión:"
    );
  });

  // The calculator is open and nobody can delete an unclaimed footprint, so
  // letting these lock would freeze the live catalogue on anonymous traffic.
  it("leaves a factor editable when only unclaimed footprints use it", () => {
    const lock = resolveEmissionFactorRowLock(true, 0, 7);

    expect(lock.canEdit).toBe(true);
    expect(lock.reason).toBeUndefined();
    expect(lock.unclaimedReferencedLineCount).toBe(7);
  });

  it("still locks when a claimed footprint uses it as well", () => {
    const lock = resolveEmissionFactorRowLock(true, 2, 7);

    expect(lock.canEdit).toBe(false);
    expect(lock.reason).toContain("2 fuentes de emisión");
  });

  it("reports no unclaimed lines on a read-only screen", () => {
    // Nothing can be deleted there, so there is no warning to carry.
    expect(
      resolveEmissionFactorRowLock(false, 0, 7).unclaimedReferencedLineCount
    ).toBe(0);
  });
});

describe("resolveEmissionFactorDeleteMessage", () => {
  it("asks the plain question when nothing depends on the factor", () => {
    expect(resolveEmissionFactorDeleteMessage(0)).toBe(
      "¿Estás seguro de que deseas eliminar este factor de emisión?"
    );
  });

  it("names the unclaimed lines and says the delete goes ahead", () => {
    const message = resolveEmissionFactorDeleteMessage(4);

    expect(message).toContain("4 fuentes de emisión");
    expect(message).toContain("anónimas sin reclamar");
    // The delete detaches them, so the copy has to promise that and not that
    // they keep what they had.
    expect(message).toContain("Volverán a pedir un factor");
    expect(message).toContain("¿Eliminarlo igual?");
  });

  // The verbs agree with the count too: "1 fuente … usan" read as a typo.
  it("keeps a single emission source in the singular throughout", () => {
    const message = resolveEmissionFactorDeleteMessage(1);

    expect(message).toContain(
      "1 fuente de emisión de una huella anónima sin reclamar usa este factor."
    );
    expect(message).toContain("Volverá a pedir un factor");
  });
});
