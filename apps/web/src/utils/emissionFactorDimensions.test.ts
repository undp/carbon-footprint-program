import { describe, expect, it } from "vitest";
import { isOtherDimensionValue } from "./emissionFactorDimensions";

describe("isOtherDimensionValue", () => {
  it.each(["Otro", "Otros", "Otra", "Otras"])(
    "recognises the escape hatch spelled %j",
    (value) => {
      expect(isOtherDimensionValue(value)).toBe(true);
    }
  );

  it.each(["otros", "OTRO", "  Otro  ", "otrAs "])(
    "ignores case and surrounding spaces in %j",
    (value) => {
      expect(isOtherDimensionValue(value)).toBe(true);
    }
  );

  it.each(["Otro proceso", "Otro país", "Otro país Latam", "Otros residuos"])(
    "does not treat %j as the escape hatch",
    (value) => {
      // These are real catalog values with their own emission factor.
      expect(isOtherDimensionValue(value)).toBe(false);
    }
  );

  it.each(["Excavadora", "", "   "])(
    "rejects the ordinary value %j",
    (value) => {
      expect(isOtherDimensionValue(value)).toBe(false);
    }
  );
});
