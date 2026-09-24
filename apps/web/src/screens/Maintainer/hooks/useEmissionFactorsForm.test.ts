import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  createNewEmissionFactorRow,
  useEmissionFactorsForm,
} from "./useEmissionFactorsForm";

/** A new row with every required field filled in except, maybe, the year. */
const filledNewRow = (year: number | null) => ({
  ...createNewEmissionFactorRow("temp_1758000000000"),
  subcategoryId: "10",
  rateMeasurementUnitId: "1",
  source: "DEFRA 2026",
  value: 2.5,
  year,
});

const validate = async (year: number | null) => {
  const { result } = renderHook(() => useEmissionFactorsForm());
  act(() =>
    result.current.form.reset({ emissionFactors: [filledNewRow(year)] })
  );
  let isValid = false;
  await act(async () => {
    isValid = await result.current.form.trigger("emissionFactors.0");
  });
  return {
    isValid,
    yearError:
      result.current.form.formState.errors.emissionFactors?.[0]?.year?.message,
  };
};

describe("new emission factor row", () => {
  it("is born without a year", () => {
    expect(createNewEmissionFactorRow("temp_1").year).toBeNull();
  });

  it("cannot be saved until the admin chooses a year", async () => {
    const { isValid, yearError } = await validate(null);

    expect(isValid).toBe(false);
    expect(yearError).toBe("Año es requerido");
  });

  it("validates once a year is chosen", async () => {
    const { isValid, yearError } = await validate(2026);

    expect(yearError).toBeUndefined();
    expect(isValid).toBe(true);
  });
});
