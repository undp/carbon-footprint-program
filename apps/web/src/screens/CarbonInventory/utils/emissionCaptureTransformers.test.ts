import { describe, expect, it } from "vitest";
import { FactorSelectionType } from "@repo/types";
import type { SyncCarbonInventoryLinesResponse } from "@repo/types";
import {
  buildLoadedFactorSnapshots,
  mapLinesToSyncRequest,
} from "./emissionCaptureTransformers";
import type { EmissionCaptureFormLine } from "../types/EmissionCaptureTypes";

type PersistedLine = SyncCarbonInventoryLinesResponse["updated"][number];

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
): EmissionCaptureFormLine => ({
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
});

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

/**
 * The stored-factor copy after a save, before the refetch lands.
 *
 * The copy has to follow the server, and the server moves when the sync
 * returns. While it lags, a factor changed and then changed back matches the
 * copy field for field, so the save would declare unchanged something the user
 * did change — and the server would keep the value they moved away from.
 */
describe("buildLoadedFactorSnapshots", () => {
  const persistedLine = (
    overrides: Partial<PersistedLine> = {}
  ): PersistedLine => ({
    id: "10",
    subcategoryId: "1",
    isManualTotalEmissions: false,
    dimensionValue1Id: null,
    dimensionValue2Id: null,
    quantity: 100,
    measurementUnitId: "5",
    factorSource: "IPCC",
    factorValue: 9.75,
    factorRateMeasurementUnitId: "8",
    emissionFactorId: "99",
    appliedFactorYear: 2022,
    comment: null,
    manualTotalEmissions: null,
    files: [],
    ...overrides,
  });

  it("carries exactly the four fields the unchanged check compares", () => {
    const snapshots = buildLoadedFactorSnapshots([persistedLine()]);

    expect(snapshots.get("10")).toEqual({
      emissionFactorId: "99",
      factorSource: "IPCC",
      factorValue: 9.75,
      factorRateMeasurementUnitId: "8",
    });
  });

  it("holds nothing for a line the request did not update", () => {
    expect(buildLoadedFactorSnapshots([]).get("10")).toBeUndefined();
  });

  it("makes a factor reverted before the refetch restate itself", () => {
    // The line was saved with factor 99; the user then goes back to 42, which
    // is what the *stale* copy still described.
    const persisted = buildLoadedFactorSnapshots([persistedLine()]);
    const reverted = buildLine({ loadedFactor: persisted.get("10") });

    // Not UNCHANGED: keeping the snapshot would leave 99 stored.
    expect(updateFor(reverted).factorSelection).toEqual({
      type: FactorSelectionType.CATALOG,
      emissionFactorId: "42",
      appliedRateMeasurementUnitId: "7",
    });
  });

  it("still declares unchanged when the save persisted what the line has", () => {
    const persisted = buildLoadedFactorSnapshots([
      persistedLine({
        emissionFactorId: "42",
        factorSource: "DEFRA",
        factorValue: 2.5,
        factorRateMeasurementUnitId: "7",
      }),
    ]);
    const untouched = buildLine({ loadedFactor: persisted.get("10") });

    expect(updateFor(untouched).factorSelection).toEqual({
      type: FactorSelectionType.UNCHANGED,
    });
  });
});
