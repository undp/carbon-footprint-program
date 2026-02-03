import type { Prisma } from "@repo/database";

/**
 * Type for a line input (picked from Prisma CarbonInventoryLineInput)
 * Only includes the fields we need to check if a line is empty
 */
type LineInputBasicFields = Pick<
  Prisma.CarbonInventoryLineInputGetPayload<Record<string, never>>,
  | "selection1Id"
  | "selection2Id"
  | "quantity"
  | "measurementUnitId"
  | "directTotalEmissions"
  | "manualFactor"
  | "manualFactorSource"
  | "manualFactorRateUnitId"
  | "comment"
>;

/**
 * Type for a line with inputs
 * Based on Prisma types but flexible enough to work with both
 */
type LineWithInputsGeneric = {
  inputs?: Array<LineInputBasicFields> | null;
};

/**
 * Determines if a carbon inventory line has been edited by checking if the active input
 * contains any non-null values. The active input is defined as the first element of
 * line.inputs, as the system maintains inputs in chronological order with the most recent
 * (active) input at index 0.
 */
export const isCarbonInventoryLineEdited = (
  line: LineWithInputsGeneric
): boolean => {
  const activeInput = line.inputs?.[0] ?? null;
  return (
    !!activeInput &&
    (activeInput.selection1Id !== null ||
      activeInput.selection2Id !== null ||
      activeInput.quantity !== null ||
      activeInput.measurementUnitId !== null ||
      activeInput.directTotalEmissions !== null ||
      activeInput.manualFactor !== null ||
      activeInput.manualFactorSource !== null ||
      activeInput.manualFactorRateUnitId !== null ||
      activeInput.comment !== null)
  );
};

/**
 * Parses the year query parameter and returns a number or undefined.
 * - If year is undefined, returns undefined (no filter)
 * - If year is a valid number string, returns the parsed number
 * - Otherwise, returns undefined
 */
export const parseYearParam = (year?: string): number | undefined => {
  if (!year) {
    return undefined;
  }
  const yearNumber = parseInt(year, 10);
  return !isNaN(yearNumber) ? yearNumber : undefined;
};
