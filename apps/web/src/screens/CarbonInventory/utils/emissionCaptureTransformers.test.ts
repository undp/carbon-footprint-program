import { describe, expect, it } from "vitest";
import { FactorSelectionType } from "@repo/types";
import { mapLinesToSyncRequest } from "./emissionCaptureTransformers";
import type { EmissionCaptureFormLine } from "../types/EmissionCaptureTypes";

/**
 * What an update declares about its factor.
 *
 * The distinction these tests protect is between *restating* a selection and
 * *not touching* it. Restating makes the stored snapshot depend on the catalog
 * still agreeing, and for a line saved before the snapshot carried a catalog id
 * it loses the factor outright — the line comes back with a catalog source name
 * and no id, which is neither a custom factor nor a catalog one.
 */
const buildLine = (
  overrides: Partial<EmissionCaptureFormLine> = {}
): EmissionCaptureFormLine =>
  ({
    id: "10",
    lineId: "10",
    subcategoryId: "1",
    isManualTotalEmissions: false,
    dimensionValue1Id: null,
    dimensionValue2Id: null,
    quantity: 100,
    measurementUnitId: "5",
    factorSource: "DEFRA",
    factorValue: 2.5,
    factorRateMeasurementUnitId: "7",
    emissionFactorId: "42",
    appliedFactorYear: 2024,
    baseFactorId: "42",
    comment: null,
    manualTotalEmissions: null,
    files: [],
    removedFileIds: [],
    loadedFactor: {
      emissionFactorId: "42",
      factorSource: "DEFRA",
      factorValue: 2.5,
      factorRateMeasurementUnitId: "7",
    },
    ...overrides,
  }) as EmissionCaptureFormLine;

const updateFor = (line: EmissionCaptureFormLine) =>
  mapLinesToSyncRequest([line]).update[0];

describe("mapLinesToSyncRequest — an untouched factor", () => {
  it("declares the factor unchanged instead of restating it", () => {
    expect(updateFor(buildLine()).factorSelection).toEqual({
      type: FactorSelectionType.UNCHANGED,
    });
  });

  it("keeps declaring it unchanged when another field was edited", () => {
    // The quantity is what the user changed; the factor still is not restated.
    const update = updateFor(buildLine({ quantity: 999, comment: "revisado" }));

    expect(update.quantity).toBe(999);
    expect(update.factorSelection).toEqual({
      type: FactorSelectionType.UNCHANGED,
    });
  });

  it("declares a legacy line unchanged rather than sending no factor", () => {
    // Saved before the snapshot carried a catalog id: a catalog source with no
    // id. Restating this line sent null, and the server read null as "no
    // factor" — dropping both the snapshot and the computed emissions.
    const line = buildLine({
      emissionFactorId: null,
      baseFactorId: null,
      appliedFactorYear: null,
      loadedFactor: {
        emissionFactorId: null,
        factorSource: "DEFRA",
        factorValue: 2.5,
        factorRateMeasurementUnitId: "7",
      },
    });

    expect(updateFor(line).factorSelection).toEqual({
      type: FactorSelectionType.UNCHANGED,
    });
  });
});

describe("mapLinesToSyncRequest — a factor the user did change", () => {
  it("states a catalog selection when the chosen factor differs", () => {
    const line = buildLine({ emissionFactorId: "99", baseFactorId: "99" });

    expect(updateFor(line).factorSelection).toEqual({
      type: FactorSelectionType.CATALOG,
      emissionFactorId: "99",
      appliedRateMeasurementUnitId: "7",
    });
  });

  it("states a custom selection when the value was edited", () => {
    const line = buildLine({
      factorSource: "Otro",
      factorValue: 9,
      emissionFactorId: null,
      baseFactorId: null,
      loadedFactor: {
        emissionFactorId: null,
        factorSource: "Otro",
        factorValue: 2.5,
        factorRateMeasurementUnitId: "7",
      },
    });

    expect(updateFor(line).factorSelection).toEqual({
      type: FactorSelectionType.CUSTOM,
      source: "Otro",
      value: 9,
      rateMeasurementUnitId: "7",
    });
  });

  it("states a direct total for a manual-mode line", () => {
    const line = buildLine({
      isManualTotalEmissions: true,
      manualTotalEmissions: 12,
    });

    // The total may well have changed, so this line always restates it.
    expect(updateFor(line).factorSelection).toEqual({
      type: FactorSelectionType.DIRECT,
      totalEmissions: 12,
    });
  });

  it("states the selection in full when there is nothing stored to keep", () => {
    const line = buildLine({
      loadedFactor: {
        emissionFactorId: null,
        factorSource: null,
        factorValue: null,
        factorRateMeasurementUnitId: null,
      },
    });

    expect(updateFor(line).factorSelection).toEqual({
      type: FactorSelectionType.CATALOG,
      emissionFactorId: "42",
      appliedRateMeasurementUnitId: "7",
    });
  });
});

describe("mapLinesToSyncRequest — creates", () => {
  it("never declares a new line's factor unchanged", () => {
    // A create has no snapshot on the server, so UNCHANGED is not even part of
    // its contract.
    const line = buildLine({ isNew: true, loadedFactor: null });

    expect(mapLinesToSyncRequest([line]).create[0].factorSelection).toEqual({
      type: FactorSelectionType.CATALOG,
      emissionFactorId: "42",
      appliedRateMeasurementUnitId: "7",
    });
  });
});
