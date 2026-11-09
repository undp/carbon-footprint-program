import { describe, expect, it } from "vitest";
import {
  emissionFactorRowKey,
  indexYearCopyTargetRows,
  planEmissionFactorYearCopy,
  YearCopyOutcome,
  type YearCopyChange,
  type YearCopyFactor,
} from "./emissionFactorYearCopy.js";

// Ids follow the base seed's shape: «Combustiones estacionarias» (10) with the
// fuel as its only dimension, and «Electricidad» (20) with both dimensions.
const STATIONARY = "10";
const ELECTRICITY = "20";
const BIODIESEL = "101";
const NATIONAL_GRID = "201";
const GRID_PERIOD = "202";
const KG_GJ = "1";
const KG_KG = "2";
const KG_M3 = "3";
const KG_KWH = "4";

let nextId = 1000;
function factor(overrides: Partial<YearCopyFactor> = {}): YearCopyFactor {
  nextId += 1;
  return {
    id: String(nextId),
    subcategoryId: STATIONARY,
    dimensionValue1Id: BIODIESEL,
    dimensionValue2Id: null,
    rateMeasurementUnitId: KG_GJ,
    source: "DEFRA 2026",
    value: "2.5",
    gasDetails: {},
    ...overrides,
  };
}

function plan(
  sourceFactors: YearCopyFactor[],
  targetFactors: YearCopyFactor[] = [],
  changes: YearCopyChange[] = []
) {
  return planEmissionFactorYearCopy({ sourceFactors, targetFactors, changes });
}

function outcomes(result: ReturnType<typeof plan>) {
  return result.rows.map((row) => row.outcome);
}

describe("emissionFactorRowKey", () => {
  it("treats NULL dimension values as equal to each other", () => {
    expect(emissionFactorRowKey(factor())).toBe(emissionFactorRowKey(factor()));
  });

  it("tells a NULL dimension value from a set one", () => {
    expect(emissionFactorRowKey(factor())).not.toBe(
      emissionFactorRowKey(factor({ dimensionValue2Id: GRID_PERIOD }))
    );
  });

  it("leaves the source and value out", () => {
    expect(emissionFactorRowKey(factor({ source: "IPCC", value: "9" }))).toBe(
      emissionFactorRowKey(factor())
    );
  });
});

describe("indexYearCopyTargetRows", () => {
  it("finds a target with the same subcategory and both dimension values in another unit", () => {
    const target = factor({
      subcategoryId: ELECTRICITY,
      dimensionValue1Id: NATIONAL_GRID,
      dimensionValue2Id: GRID_PERIOD,
      rateMeasurementUnitId: KG_KWH,
    });
    const index = indexYearCopyTargetRows([target]);
    expect(index.find({ ...target, rateMeasurementUnitId: KG_GJ })).toEqual([
      target,
    ]);
  });

  it("does not match another unit when a dimension value is NULL", () => {
    const index = indexYearCopyTargetRows([factor()]);
    expect(index.find(factor({ rateMeasurementUnitId: KG_KG }))).toEqual([]);
  });

  it("lists every target factor of a row once", () => {
    const targets = [
      factor({
        subcategoryId: ELECTRICITY,
        dimensionValue1Id: NATIONAL_GRID,
        dimensionValue2Id: GRID_PERIOD,
        rateMeasurementUnitId: KG_KWH,
      }),
    ];
    targets.push({ ...targets[0], id: "9999", source: "IPCC" });
    const index = indexYearCopyTargetRows(targets);
    expect(index.find(targets[0])).toHaveLength(2);
  });
});

describe("planEmissionFactorYearCopy", () => {
  it("copies every factor into an empty target year", () => {
    const result = plan([factor(), factor({ rateMeasurementUnitId: KG_KG })]);
    expect(outcomes(result)).toEqual([
      YearCopyOutcome.COPY,
      YearCopyOutcome.COPY,
    ]);
    expect(result.violations).toEqual([]);
    expect(result.summary).toEqual({
      copiedCount: 2,
      editedCount: 0,
      excludedCount: 0,
      existingCount: 0,
    });
  });

  describe("exact-row matching", () => {
    it("skips a source factor whose row the target holds, NULL dimensions included", () => {
      const source = factor();
      const result = plan([source], [factor({ value: "7", source: "IPCC" })]);
      expect(outcomes(result)).toEqual([YearCopyOutcome.EXISTS_IN_TARGET]);
      expect(result.summary.existingCount).toBe(1);
    });

    it("copies the three Biodiésel rate units into an empty year", () => {
      const result = plan([
        factor({ rateMeasurementUnitId: KG_GJ }),
        factor({ rateMeasurementUnitId: KG_KG }),
        factor({ rateMeasurementUnitId: KG_M3 }),
      ]);
      expect(result.summary.copiedCount).toBe(3);
      expect(result.violations).toEqual([]);
    });

    it("completes a partially loaded target year", () => {
      const result = plan(
        [
          factor({ rateMeasurementUnitId: KG_GJ }),
          factor({ rateMeasurementUnitId: KG_KG }),
          factor({ rateMeasurementUnitId: KG_M3 }),
        ],
        [factor({ rateMeasurementUnitId: KG_GJ })]
      );
      expect(outcomes(result)).toEqual([
        YearCopyOutcome.EXISTS_IN_TARGET,
        YearCopyOutcome.COPY,
        YearCopyOutcome.COPY,
      ]);
    });

    it("skips a both-dimension factor whose dimensions the target holds in another unit", () => {
      const both = {
        subcategoryId: ELECTRICITY,
        dimensionValue1Id: NATIONAL_GRID,
        dimensionValue2Id: GRID_PERIOD,
      };
      const result = plan(
        [factor({ ...both, rateMeasurementUnitId: KG_GJ })],
        [factor({ ...both, rateMeasurementUnitId: KG_KWH })]
      );
      expect(outcomes(result)).toEqual([YearCopyOutcome.EXISTS_IN_TARGET]);
      expect(result.violations).toEqual([]);
    });

    it("skips a row the target holds with another source", () => {
      const result = plan(
        [factor({ source: "DEFRA 2026" })],
        [factor({ source: "Inventario nacional 2027" })]
      );
      expect(outcomes(result)).toEqual([YearCopyOutcome.EXISTS_IN_TARGET]);
    });

    it("ignores the change of a skipped factor", () => {
      const source = factor();
      const result = plan(
        [source],
        [factor()],
        [{ sourceFactorId: source.id, value: null, source: " " }]
      );
      expect(result.violations).toEqual([]);
      expect(result.rows[0].result.edited).toBe(false);
      expect(result.summary.editedCount).toBe(0);
    });
  });

  describe("exclusion", () => {
    it("leaves an excluded factor out and counts it", () => {
      const source = factor();
      const result = plan(
        [source],
        [],
        [{ sourceFactorId: source.id, exclude: true }]
      );
      expect(outcomes(result)).toEqual([YearCopyOutcome.EXCLUDED]);
      expect(result.summary).toMatchObject({
        copiedCount: 0,
        excludedCount: 1,
      });
    });

    it("ignores the other fields of an excluded change", () => {
      const kept = factor({ source: "DEFRA 2026" });
      const excluded = factor({ source: "IPCC 2006" });
      const result = plan(
        [kept, excluded],
        [],
        [
          {
            sourceFactorId: excluded.id,
            exclude: true,
            source: "defra 2026",
            value: null,
          },
        ]
      );
      expect(result.violations).toEqual([]);
      expect(result.summary.copiedCount).toBe(1);
    });
  });

  describe("sources", () => {
    it("accepts a second source in a subcategory", () => {
      const first = factor({ rateMeasurementUnitId: KG_GJ });
      const second = factor({ rateMeasurementUnitId: KG_KG });
      const result = plan(
        [first, second],
        [],
        [{ sourceFactorId: second.id, source: "DEFRA 2027" }]
      );
      expect(result.violations).toEqual([]);
      expect(result.rows[1].result).toMatchObject({
        source: "DEFRA 2027",
        sourceChanged: true,
        edited: true,
      });
    });

    it("copies the alternatives of one row, each with its source", () => {
      const result = plan([
        factor({ source: "DEFRA 2026" }),
        factor({ source: "IPCC 2006" }),
      ]);
      expect(result.summary.copiedCount).toBe(2);
      expect(result.violations).toEqual([]);
    });

    it("reports both alternatives that end with one source, case and spaces aside", () => {
      const defra = factor({ source: "DEFRA 2026" });
      const ipcc = factor({ source: "IPCC 2006" });
      const result = plan(
        [defra, ipcc],
        [],
        [{ sourceFactorId: ipcc.id, source: "  defra   2026 " }]
      );
      expect(result.violations).toEqual([
        { sourceFactorId: defra.id, reason: "DUPLICATE_TARGET_FACTOR" },
        { sourceFactorId: ipcc.id, reason: "DUPLICATE_TARGET_FACTOR" },
      ]);
    });

    it("reports two both-dimension factors with one source in different units", () => {
      const both = {
        subcategoryId: ELECTRICITY,
        dimensionValue1Id: NATIONAL_GRID,
        dimensionValue2Id: GRID_PERIOD,
      };
      const kwh = factor({ ...both, rateMeasurementUnitId: KG_KWH });
      const gj = factor({ ...both, rateMeasurementUnitId: KG_GJ });
      const result = plan([kwh, gj]);
      expect(result.violations.map((v) => v.sourceFactorId)).toEqual([
        kwh.id,
        gj.id,
      ]);
      expect(new Set(result.violations.map((v) => v.reason))).toEqual(
        new Set(["DUPLICATE_TARGET_FACTOR"])
      );
    });

    it("stores a changed source as the request schema does", () => {
      const source = factor();
      const result = plan(
        [source],
        [],
        [{ sourceFactorId: source.id, source: "  DEFRA   2027 " }]
      );
      expect(result.rows[0].result.source).toBe("DEFRA 2027");
    });

    it("blocks an empty source", () => {
      const source = factor();
      const result = plan(
        [source],
        [],
        [{ sourceFactorId: source.id, source: "   " }]
      );
      expect(result.violations).toEqual([
        { sourceFactorId: source.id, reason: "EMPTY_SOURCE" },
      ]);
    });

    it("does not report two empty sources as a duplicate", () => {
      const a = factor();
      const b = factor({ source: "IPCC" });
      const result = plan(
        [a, b],
        [],
        [
          { sourceFactorId: a.id, source: "" },
          { sourceFactorId: b.id, source: "" },
        ]
      );
      expect(result.violations.map((v) => v.reason)).toEqual([
        "EMPTY_SOURCE",
        "EMPTY_SOURCE",
      ]);
    });
  });

  describe("values", () => {
    it("blocks an emptied value", () => {
      const source = factor();
      const result = plan(
        [source],
        [],
        [{ sourceFactorId: source.id, value: null }]
      );
      expect(result.violations).toEqual([
        { sourceFactorId: source.id, reason: "EMPTY_VALUE" },
      ]);
    });

    it("accepts a negative value", () => {
      const source = factor();
      const result = plan(
        [source],
        [],
        [{ sourceFactorId: source.id, value: -0.5 }]
      );
      expect(result.violations).toEqual([]);
      expect(result.rows[0].result).toMatchObject({
        value: -0.5,
        edited: true,
      });
    });

    it("does not count a value written differently but numerically equal as edited", () => {
      const source = factor({ value: "0.1770" });
      const result = plan(
        [source],
        [],
        [{ sourceFactorId: source.id, value: 0.177 }]
      );
      expect(result.rows[0].result.valueChanged).toBe(false);
      expect(result.summary.editedCount).toBe(0);
    });

    it("counts a change with only a different gas breakdown as edited", () => {
      const source = factor({ gasDetails: { CO2_FOSSIL: 2.5 } });
      const result = plan(
        [source],
        [],
        [{ sourceFactorId: source.id, gasDetails: { CO2_FOSSIL: 2, CH4: 0.5 } }]
      );
      expect(result.rows[0].result).toMatchObject({
        valueChanged: false,
        sourceChanged: false,
        gasDetailsChanged: true,
        edited: true,
      });
      expect(result.summary.editedCount).toBe(1);
    });

    it("does not count an equal gas breakdown with zeros spelled out as edited", () => {
      const source = factor({ gasDetails: {} });
      const result = plan(
        [source],
        [],
        [{ sourceFactorId: source.id, gasDetails: { CO2_FOSSIL: 0, CH4: 0 } }]
      );
      expect(result.rows[0].result.gasDetailsChanged).toBe(false);
    });
  });

  describe("changes", () => {
    it("reports a change for a factor outside the source year", () => {
      const result = plan([factor()], [], [{ sourceFactorId: "424242" }]);
      expect(result.violations).toEqual([
        { sourceFactorId: "424242", reason: "UNKNOWN_SOURCE_FACTOR" },
      ]);
    });

    it("reports a second change for one factor once", () => {
      const source = factor();
      const result = plan(
        [source],
        [],
        [
          { sourceFactorId: source.id, value: 1 },
          { sourceFactorId: source.id, value: 2 },
          { sourceFactorId: source.id, value: 3 },
        ]
      );
      expect(result.violations).toEqual([
        { sourceFactorId: source.id, reason: "DUPLICATE_CHANGE" },
      ]);
    });
  });
});
