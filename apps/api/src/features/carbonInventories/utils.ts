import type { Prisma } from "@repo/database";
import {
  OrganizationDataFieldSchema,
  type OrganizationDataField,
  type RankingSeverity,
} from "@repo/types";
import { PERCENTAGE_PRECISION } from "@/config/constants.js";
import { DataIntegrityError } from "../../errors/DataIntegrityError.js";

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

const pFactor = 10 ** PERCENTAGE_PRECISION;

/**
 * Distributes percentages using the largest remainder method so they sum to exactly 1.
 * Each percentage is rounded to {@link PERCENTAGE_PRECISION} decimal places.
 */
export function distributePercentages(
  values: number[],
  total: number
): number[] {
  if (total === 0 || values.length === 0) {
    return values.map(() => 0);
  }

  const rawPercentages = values.map((v) => v / total);
  const truncated = rawPercentages.map(
    (p) => Math.floor(p * pFactor) / pFactor
  );
  const remainders = rawPercentages.map(
    (p) => p * pFactor - Math.floor(p * pFactor)
  );

  const currentSum = truncated.reduce((a, b) => a + b, 0);
  const diff = Math.round((1 - currentSum) * pFactor);
  const step = 1 / pFactor;

  // Sort indices by remainder descending, and add one step to each until sum = 1
  const sorted = remainders
    .map((remainder, index) => ({ remainder, index }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < diff && i < sorted.length; i++) {
    truncated[sorted[i].index] += step;
  }

  return truncated.map((p) => Math.round(p * pFactor) / pFactor);
}

export function getRankingSeverity(percentage: number): RankingSeverity {
  if (percentage >= 0.25) return "HIGH";
  if (percentage >= 0.1) return "MEDIUM";
  return "LOW";
}

// Validate organizationData with runtime type checking using Zod
export function safeParseCarbonInventoryOrganizationData(
  carbonInventoryId: string,
  data: unknown
): OrganizationDataField {
  const organizationDataResult = OrganizationDataFieldSchema.safeParse(data);

  if (!organizationDataResult.success)
    throw new DataIntegrityError(
      `Invalid organizationData structure for carbon inventory ${carbonInventoryId}: ${organizationDataResult.error.message}`
    );

  return organizationDataResult.data;
}
