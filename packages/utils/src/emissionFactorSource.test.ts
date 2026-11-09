import { describe, expect, it } from "vitest";
import { EmissionFactorSourceSchema } from "@repo/types";
import { emissionFactorSourceKey } from "./emissionFactorSource.js";

describe("emissionFactorSourceKey", () => {
  it("ignores letter case", () => {
    expect(emissionFactorSourceKey("DEFRA 2026")).toBe(
      emissionFactorSourceKey("defra 2026")
    );
  });

  it("ignores outer whitespace", () => {
    expect(emissionFactorSourceKey("  DEFRA 2026\t")).toBe("defra 2026");
  });

  it("collapses inner whitespace runs", () => {
    expect(emissionFactorSourceKey("DEFRA \n  2026")).toBe("defra 2026");
  });

  it("keeps different sources apart", () => {
    expect(emissionFactorSourceKey("DEFRA 2026")).not.toBe(
      emissionFactorSourceKey("DEFRA 2027")
    );
  });

  it.each(["DEFRA 2026", "  DEFRA   2026 ", "ipcc\t2006", "EcoAct 2020"])(
    "gives %j the key of its stored form",
    (source) => {
      expect(emissionFactorSourceKey(source)).toBe(
        emissionFactorSourceKey(EmissionFactorSourceSchema.parse(source))
      );
    }
  );
});
