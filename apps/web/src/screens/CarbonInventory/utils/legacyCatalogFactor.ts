import { CUSTOM_FACTOR_SOURCES } from "@/config/constants";
import type { CarbonInventoryLine, MethodologyEmissionFactor } from "../types";

/** The fields a legacy line is identified by; nothing else is read. */
export type LegacyCatalogFactorLine = Pick<
  CarbonInventoryLine,
  | "emissionFactorId"
  | "factorSource"
  | "factorValue"
  | "factorRateMeasurementUnitId"
  | "dimensionValue1Id"
  | "dimensionValue2Id"
>;

/**
 * Two applied values are the same factor when they agree to the precision a
 * round-trip through JSON keeps. The catalog value arrives as a string with the
 * column's full scale and the line's as a double, so an exact comparison would
 * reject the very rows this lookup exists for.
 */
const isSameFactorValue = (catalogValue: string, appliedValue: number) => {
  const parsed = Number(catalogValue);
  if (!Number.isFinite(parsed)) return false;
  return (
    Math.abs(parsed - appliedValue) <=
    1e-9 * Math.max(1, Math.abs(parsed), Math.abs(appliedValue))
  );
};

const matchesDimension = (
  factorValueId: string | null,
  lineValueId: string | null
) => factorValueId === null || factorValueId === lineValueId;

/**
 * Recovers the catalog identity of a line saved before the server snapshotted it.
 *
 * Until this PR the capture screen reopened every line with no factor id, and
 * the API wrote `emission_factor_id` from exactly that field — so a line edited
 * after a reload kept its provider in `applied_factor_source` and lost the id.
 * Seeding the selector from the snapshot alone would leave those lines with an
 * empty `Factor` cell, and the first edit to any other cell would either let the
 * recommendation replace the organization's choice or, with no unique
 * recommendation, drop the factor and the line's emissions with it.
 *
 * The match is deliberately narrow — same provider, same applied value, same
 * rate unit, same dimension values — and anything ambiguous, such as two
 * vintages of one provider published at the same value, resolves to null. An
 * empty cell the user fills in is recoverable; a silently guessed vintage is
 * not.
 *
 * The recovered id feeds the selector and the next save. It deliberately does
 * not touch `emissionFactorId` or `appliedFactorYear`, which describe what was
 * actually stored: the line has no recorded vintage, and inventing one would put
 * it under a year-mismatch warning it never earned.
 */
export const resolveLegacyCatalogFactorId = (
  line: LegacyCatalogFactorLine,
  emissionFactors: MethodologyEmissionFactor[]
): string | null => {
  if (line.emissionFactorId !== null) return line.emissionFactorId;

  const { factorSource, factorValue, factorRateMeasurementUnitId } = line;
  if (
    factorSource === null ||
    factorValue === null ||
    factorRateMeasurementUnitId === null ||
    CUSTOM_FACTOR_SOURCES.includes(factorSource)
  ) {
    return null;
  }

  const canonicalIds = new Set(
    emissionFactors
      .filter(
        (factor) =>
          factor.source === factorSource &&
          factor.rateMeasurementUnitId === factorRateMeasurementUnitId &&
          matchesDimension(factor.dimensionValue1Id, line.dimensionValue1Id) &&
          matchesDimension(factor.dimensionValue2Id, line.dimensionValue2Id) &&
          isSameFactorValue(factor.value, factorValue)
      )
      .map((factor) => factor.baseEmissionFactorId)
  );

  return canonicalIds.size === 1 ? [...canonicalIds][0] : null;
};
