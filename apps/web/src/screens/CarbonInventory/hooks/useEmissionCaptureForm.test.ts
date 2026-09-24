import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEmissionCaptureForm } from "./useEmissionCaptureForm";
import type {
  EmissionCaptureFormLine,
  EmissionCaptureMergedData,
} from "../types/EmissionCaptureTypes";

const SUBCATEGORY_ID = "10";

const savedLine = (
  id: string,
  overrides: Partial<EmissionCaptureFormLine>
): EmissionCaptureFormLine => ({
  id,
  lineId: id,
  subcategoryId: SUBCATEGORY_ID,
  isManualTotalEmissions: false,
  dimensionValue1Id: null,
  dimensionValue2Id: null,
  quantity: 40,
  measurementUnitId: "kwh",
  factorSource: "DEFRA 2025",
  factorValue: 2.5,
  factorRateMeasurementUnitId: "kg-per-kwh",
  comment: null,
  manualTotalEmissions: null,
  baseFactorId: null,
  files: [],
  removedFileIds: [],
  ...overrides,
});

/**
 * One subcategory whose methodology offers factor 1 — the shape capture gets
 * once the rest of the catalogue has been deleted, re-dated or moved away.
 */
const buildData = (
  lines: EmissionCaptureFormLine[]
): EmissionCaptureMergedData =>
  ({
    year: 2025,
    name: "Huella",
    usageMode: "EXPERT",
    categories: [
      {
        id: "1",
        subcategories: [
          {
            id: SUBCATEGORY_ID,
            emissionFactors: [{ id: "1", originalEmissionFactorId: null }],
            lines,
            isTotalManualEmissionsModeAvailable: false,
            isTotalManualEmissionsModeActive: false,
          },
        ],
      },
    ],
  }) as unknown as EmissionCaptureMergedData;

// The data is built once: the reconciliation effect keys on its identity, the
// way it does on the query result, so a fresh object per render would re-run it
// forever.
const renderForm = (lines: EmissionCaptureFormLine[]) => {
  const data = buildData(lines);
  return renderHook(() => useEmissionCaptureForm({ data })).result;
};

const lineAt = (
  result: ReturnType<typeof renderForm>,
  lineId: string
): EmissionCaptureFormLine =>
  result.current.getValues(`subcategories.${SUBCATEGORY_ID}.lines.${lineId}`);

describe("useEmissionCaptureForm — catalogue factors no longer offered", () => {
  it("drops a saved factor the methodology stopped offering, keeping the rest", async () => {
    const result = renderForm([savedLine("50", { baseFactorId: "99" })]);

    await waitFor(() => expect(lineAt(result, "50").baseFactorId).toBeNull());
    const line = lineAt(result, "50");
    expect(line.factorValue).toBeNull();
    expect(line.factorSource).toBeNull();
    // The line keeps what the user entered and comes back asking for a factor.
    expect(line.quantity).toBe(40);
    expect(line.measurementUnitId).toBe("kwh");
    // Marked as a change, so the next save persists it and the server stops
    // counting the total the screen no longer shows.
    expect(result.current.getDirtyLineIds().has("50")).toBe(true);
  });

  it("keeps a factor that is still offered", async () => {
    const result = renderForm([savedLine("50", { baseFactorId: "1" })]);

    await waitFor(() => expect(lineAt(result, "50")).toBeDefined());
    expect(lineAt(result, "50").baseFactorId).toBe("1");
    expect(result.current.getDirtyLineIds().has("50")).toBe(false);
  });

  it("leaves a manual factor alone", async () => {
    const result = renderForm([
      savedLine("50", {
        baseFactorId: null,
        factorSource: "Otro",
        factorValue: 7,
      }),
    ]);

    await waitFor(() => expect(lineAt(result, "50")).toBeDefined());
    expect(lineAt(result, "50").factorValue).toBe(7);
    expect(lineAt(result, "50").factorSource).toBe("Otro");
  });

  it("leaves a direct total alone", async () => {
    const result = renderForm([
      savedLine("50", {
        isManualTotalEmissions: true,
        baseFactorId: "99",
        manualTotalEmissions: 12,
      }),
    ]);

    await waitFor(() => expect(lineAt(result, "50")).toBeDefined());
    expect(lineAt(result, "50").baseFactorId).toBe("99");
    expect(lineAt(result, "50").manualTotalEmissions).toBe(12);
  });
});
