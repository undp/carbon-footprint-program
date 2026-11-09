import {
  EmissionFactorSourceSchema,
  EmissionFactorYearCopyViolationReason,
  type EmissionFactorYearCopyViolation,
} from "@repo/types";
import { emissionFactorSourceKey } from "./emissionFactorSource.js";

/**
 * The year copy planner: which source-year factors a copy creates, which it
 * leaves out, which already exist in the target year, and which rules the
 * result breaks. The copy page runs it on every edit for its blockers, and the
 * API runs it inside the transaction before writing, so both apply one rule
 * set. Pure functions over plain data: ids as strings, values as the listing
 * returns them.
 */

/** A factor as the planner reads it, from either year. */
export interface YearCopyFactor {
  id: string;
  subcategoryId: string;
  dimensionValue1Id: string | null;
  dimensionValue2Id: string | null;
  rateMeasurementUnitId: string;
  source: string;
  /** As the listing returns it (a decimal string), or a number. */
  value: string | number;
  gasDetails?: unknown;
}

/**
 * One source factor's change. The API sends what the contract carries; the
 * page also sends what the admin is typing, so a value may be `null` (an
 * emptied cell) and a source may be blank.
 */
export interface YearCopyChange {
  sourceFactorId: string;
  value?: number | null;
  source?: string;
  gasDetails?: unknown;
  exclude?: boolean;
}

export const YearCopyOutcome = {
  /** Created in the target year. */
  COPY: "COPY",
  /** Left out by its change. */
  EXCLUDED: "EXCLUDED",
  /** Its row already exists in the target year: never overwritten. */
  EXISTS_IN_TARGET: "EXISTS_IN_TARGET",
} as const;

export type YearCopyOutcome =
  (typeof YearCopyOutcome)[keyof typeof YearCopyOutcome];

/** The factor a copy would write: the change over the source factor. */
export interface YearCopyResult {
  /** Normalized as `EmissionFactorSourceSchema` stores it; `""` when blank. */
  source: string;
  /** `null` when emptied. */
  value: number | null;
  gasDetails: unknown;
  valueChanged: boolean;
  sourceChanged: boolean;
  gasDetailsChanged: boolean;
  /** Any of the three differs from the source factor. */
  edited: boolean;
}

export interface YearCopyPlanRow<T extends YearCopyFactor = YearCopyFactor> {
  sourceFactorId: string;
  sourceFactor: T;
  outcome: YearCopyOutcome;
  /** The target-year factors on its row; empty unless `EXISTS_IN_TARGET`. */
  targetFactors: T[];
  result: YearCopyResult;
}

/**
 * The violations the planner reports. `GAS_DETAILS_MISMATCH` is not among
 * them: the API adds it, where the tolerance lives.
 */
export type YearCopyPlanViolation = EmissionFactorYearCopyViolation;

export interface YearCopyPlan<T extends YearCopyFactor = YearCopyFactor> {
  /** One per source factor, in the order given. */
  rows: YearCopyPlanRow<T>[];
  violations: YearCopyPlanViolation[];
  summary: {
    copiedCount: number;
    editedCount: number;
    excludedCount: number;
    existingCount: number;
  };
}

type RowKeyFactor = Pick<
  YearCopyFactor,
  | "subcategoryId"
  | "dimensionValue1Id"
  | "dimensionValue2Id"
  | "rateMeasurementUnitId"
>;

/**
 * The exact row a factor sits on: subcategory, both dimension values (NULL
 * equal to NULL) and rate unit. The source is left out on purpose: a copy never
 * adds a second source to a row the target year holds.
 */
export function emissionFactorRowKey(factor: RowKeyFactor): string {
  return [
    factor.subcategoryId,
    factor.dimensionValue1Id ?? "",
    factor.dimensionValue2Id ?? "",
    factor.rateMeasurementUnitId,
  ].join("|");
}

/**
 * The key of the unique index `emission_factor_unique_subcategory_dims_source`
 * without the source: only factors with both dimension values have one, and it
 * leaves out the rate unit.
 */
function bothDimensionsKey(factor: RowKeyFactor): string | null {
  if (factor.dimensionValue1Id === null || factor.dimensionValue2Id === null) {
    return null;
  }
  return [
    factor.subcategoryId,
    factor.dimensionValue1Id,
    factor.dimensionValue2Id,
  ].join("|");
}

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export interface YearCopyTargetIndex<T extends YearCopyFactor> {
  /**
   * The target-year factors a source factor would land on: the same exact row,
   * and, when the source factor has both dimension values, any factor with the
   * same subcategory and dimension values in another rate unit (the unique
   * index would make a copy with the same source collide).
   */
  find(factor: RowKeyFactor): T[];
}

export function indexYearCopyTargetRows<T extends YearCopyFactor>(
  targetFactors: readonly T[]
): YearCopyTargetIndex<T> {
  const byRow = new Map<string, T[]>();
  const byBothDimensions = new Map<string, T[]>();
  for (const factor of targetFactors) {
    pushTo(byRow, emissionFactorRowKey(factor), factor);
    const key = bothDimensionsKey(factor);
    if (key !== null) pushTo(byBothDimensions, key, factor);
  }

  return {
    find(factor) {
      const exact = byRow.get(emissionFactorRowKey(factor)) ?? [];
      const key = bothDimensionsKey(factor);
      const sameDimensions =
        key === null ? [] : (byBothDimensions.get(key) ?? []);
      if (sameDimensions.length === 0) return exact;
      return [...new Set([...exact, ...sameDimensions])];
    },
  };
}

/** A source as `EmissionFactorSourceSchema` stores it, or `""` when blank. */
function storedSource(source: string): string {
  const parsed = EmissionFactorSourceSchema.safeParse(source);
  return parsed.success ? parsed.data : "";
}

function gasAmounts(gasDetails: unknown): Map<string, number> {
  const amounts = new Map<string, number>();
  if (gasDetails === null || typeof gasDetails !== "object") return amounts;
  for (const [gas, amount] of Object.entries(gasDetails)) {
    if (typeof amount === "number" && amount !== 0) amounts.set(gas, amount);
  }
  return amounts;
}

/** Two gas breakdowns are equal when every gas has the same amount, 0 when missing. */
function gasDetailsEqual(a: unknown, b: unknown): boolean {
  const amountsA = gasAmounts(a);
  const amountsB = gasAmounts(b);
  if (amountsA.size !== amountsB.size) return false;
  for (const [gas, amount] of amountsA) {
    if (amountsB.get(gas) !== amount) return false;
  }
  return true;
}

function resolveResult(
  factor: YearCopyFactor,
  change: YearCopyChange | undefined
): YearCopyResult {
  const sourceValue = Number(factor.value);
  const value = change?.value !== undefined ? change.value : sourceValue;
  const source =
    change?.source !== undefined ? storedSource(change.source) : factor.source;
  const gasDetails =
    change?.gasDetails !== undefined ? change.gasDetails : factor.gasDetails;

  const valueChanged = value === null || value !== sourceValue;
  const sourceChanged = source !== factor.source;
  const gasDetailsChanged =
    change?.gasDetails !== undefined &&
    !gasDetailsEqual(change.gasDetails, factor.gasDetails);

  return {
    source,
    value,
    gasDetails,
    valueChanged,
    sourceChanged,
    gasDetailsChanged,
    edited: valueChanged || sourceChanged || gasDetailsChanged,
  };
}

/**
 * Plans a copy of `sourceFactors` into the year of `targetFactors`, both of
 * one methodology version and both already filtered to the factors the
 * maintainer shows.
 *
 * A source factor whose row already exists in the target year is skipped and
 * its change ignored; an excluded one is left out; every other one is copied
 * with its change applied. Then the copied factors are checked: no two may end
 * on the same row with the same source (sources compared through
 * `emissionFactorSourceKey`, and for factors with both dimension values also on
 * the unique index's key, which leaves out the rate unit), and none may have an
 * empty source or value. Changes must name a source factor, once.
 */
export function planEmissionFactorYearCopy<T extends YearCopyFactor>({
  sourceFactors,
  targetFactors,
  changes,
}: {
  sourceFactors: readonly T[];
  targetFactors: readonly T[];
  changes: readonly YearCopyChange[];
}): YearCopyPlan<T> {
  const violations: YearCopyPlanViolation[] = [];
  const reported = new Set<string>();
  const report = (
    sourceFactorId: string,
    reason: YearCopyPlanViolation["reason"]
  ): void => {
    const key = `${sourceFactorId}|${reason}`;
    if (reported.has(key)) return;
    reported.add(key);
    violations.push({ sourceFactorId, reason });
  };

  const sourceIds = new Set(sourceFactors.map((factor) => factor.id));
  const changeById = new Map<string, YearCopyChange>();
  for (const change of changes) {
    if (!sourceIds.has(change.sourceFactorId)) {
      report(
        change.sourceFactorId,
        EmissionFactorYearCopyViolationReason.UNKNOWN_SOURCE_FACTOR
      );
    } else if (changeById.has(change.sourceFactorId)) {
      report(
        change.sourceFactorId,
        EmissionFactorYearCopyViolationReason.DUPLICATE_CHANGE
      );
    } else {
      changeById.set(change.sourceFactorId, change);
    }
  }

  const targetIndex = indexYearCopyTargetRows(targetFactors);
  const rows: YearCopyPlanRow<T>[] = sourceFactors.map((sourceFactor) => {
    const change = changeById.get(sourceFactor.id);
    const targets = targetIndex.find(sourceFactor);
    const outcome =
      targets.length > 0
        ? YearCopyOutcome.EXISTS_IN_TARGET
        : change?.exclude
          ? YearCopyOutcome.EXCLUDED
          : YearCopyOutcome.COPY;
    // A skipped factor is never written, so its change does not apply; an
    // excluded one keeps its change, which the page shows struck through.
    const result = resolveResult(
      sourceFactor,
      outcome === YearCopyOutcome.EXISTS_IN_TARGET ? undefined : change
    );
    return {
      sourceFactorId: sourceFactor.id,
      sourceFactor,
      outcome,
      targetFactors: targets,
      result,
    };
  });

  const copied = rows.filter((row) => row.outcome === YearCopyOutcome.COPY);
  const sameTargetGroups = new Map<string, string[]>();
  for (const row of copied) {
    if (row.result.source === "") {
      report(
        row.sourceFactorId,
        EmissionFactorYearCopyViolationReason.EMPTY_SOURCE
      );
    }
    if (row.result.value === null || !Number.isFinite(row.result.value)) {
      report(
        row.sourceFactorId,
        EmissionFactorYearCopyViolationReason.EMPTY_VALUE
      );
    }
    if (row.result.source === "") continue;

    const sourceKey = emissionFactorSourceKey(row.result.source);
    pushTo(
      sameTargetGroups,
      `row|${emissionFactorRowKey(row.sourceFactor)}|${sourceKey}`,
      row.sourceFactorId
    );
    const indexKey = bothDimensionsKey(row.sourceFactor);
    if (indexKey !== null) {
      pushTo(
        sameTargetGroups,
        `index|${indexKey}|${sourceKey}`,
        row.sourceFactorId
      );
    }
  }
  for (const ids of sameTargetGroups.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      report(id, EmissionFactorYearCopyViolationReason.DUPLICATE_TARGET_FACTOR);
    }
  }

  return {
    rows,
    violations,
    summary: {
      copiedCount: copied.length,
      editedCount: copied.filter((row) => row.result.edited).length,
      excludedCount: rows.filter(
        (row) => row.outcome === YearCopyOutcome.EXCLUDED
      ).length,
      existingCount: rows.filter(
        (row) => row.outcome === YearCopyOutcome.EXISTS_IN_TARGET
      ).length,
    },
  };
}
