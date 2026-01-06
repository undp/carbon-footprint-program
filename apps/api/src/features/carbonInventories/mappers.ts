import type { Prisma } from "@repo/database";
import type { CarbonInventory as PrismaCarbonInventory } from "@repo/database";
import type { CarbonInventory as ResponseCarbonInventory } from "@repo/types";
import { OrganizationDataSchema } from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";

// Prisma type for carbon inventory with lines, inputs, and factors
// Note: subcategories are fetched separately to avoid duplication
type CarbonInventoryWithLines = Prisma.CarbonInventoryGetPayload<{
  include: {
    lines: {
      include: {
        inputs: {
          include: {
            factor: true;
          };
        };
      };
    };
  };
}>;

// Helper type for a line with inputs
export type LineWithInputs = NonNullable<
  CarbonInventoryWithLines["lines"]
>[number];

type LineResponse = ResponseCarbonInventory["lines"][number];

/**
 * Converts a value to a number if it's not null/undefined, otherwise returns null.
 */
function toNumberOrNull(value: unknown): number | null {
  return value !== null && value !== undefined ? Number(value) : null;
}

export function mapLineToResponse(line: LineWithInputs): LineResponse {
  // Get the active input (should be at most one due to our query)
  const activeInput = line.inputs?.[0] ?? null;

  // Determine if manual total emissions are used
  const isManualTotalEmissions = activeInput
    ? activeInput.inputType === "DIRECT"
    : false;

  const dimensionValue1Id = activeInput?.selection1Id?.toString() ?? null;
  const dimensionValue2Id = activeInput?.selection2Id?.toString() ?? null;

  // Get quantity
  const quantity = toNumberOrNull(activeInput?.quantity);

  const measurementUnitId = activeInput?.measurementUnitId?.toString() ?? null;

  // Get factor source and value
  // Priority: manualFactorSource/manualFactor > factor.appliedFactorSource/appliedFactorValue
  const factorSource =
    activeInput?.manualFactorSource ??
    activeInput?.factor?.appliedFactorSource ??
    null;

  const factorValue =
    toNumberOrNull(activeInput?.manualFactor) ??
    toNumberOrNull(activeInput?.factor?.appliedFactorValue) ??
    null;

  const factorRateMeasurementUnitId =
    activeInput?.manualFactorRateUnitId?.toString() ??
    activeInput?.factor?.appliedFactorRateUnitId?.toString() ??
    null;

  const comment = activeInput?.comment ?? null;

  const manualTotalEmissions = toNumberOrNull(
    activeInput?.directTotalEmissions
  );

  return {
    id: String(line.id),
    subcategoryId: line.subcategoryId.toString(),
    isManualTotalEmissions,
    dimensionValue1Id,
    dimensionValue2Id,
    quantity,
    measurementUnitId,
    factorSource,
    factorValue,
    factorRateMeasurementUnitId,
    comment,
    manualTotalEmissions,
  };
}

function mapBaseCarbonInventory(
  item: PrismaCarbonInventory
): Omit<ResponseCarbonInventory, "lines"> {
  // Validate organizationData with runtime type checking using Zod
  const organizationDataResult = OrganizationDataSchema.nullable().safeParse(
    item.organizationData
  );

  if (!organizationDataResult.success)
    throw new DataIntegrityError(
      `Invalid organizationData structure for carbon inventory ${item.id}: ${organizationDataResult.error.message}`
    );

  return {
    id: item.id.toString(),
    organizationId: item.organizationId?.toString() ?? null,
    organizationBranchId: item.organizationBranchId?.toString() ?? null,
    organizationData: organizationDataResult.data,
    year: item.year,
    status: item.status,
    usageMode: item.usageMode,
    methodologyVersionId: item.methodologyVersionId?.toString() ?? null,
    preselectedNodesId: item.preselectedNodesId?.toString() ?? null,
    isEditable: item.isEditable,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    createdById: item.createdById?.toString() ?? null,
    updatedById: item.updatedById?.toString() ?? null,
  };
}

// Map carbon inventory with lines to response (includes lines field)
export function mapCarbonInventoryWithLinesToResponse(
  item: CarbonInventoryWithLines
): ResponseCarbonInventory {
  const base = mapBaseCarbonInventory(item);
  const lines = item.lines.map(mapLineToResponse);

  return {
    ...base,
    lines,
  };
}

// Map carbon inventory without lines to response (omits lines field)
export function mapCarbonInventoryToResponse(
  item: PrismaCarbonInventory
): Omit<ResponseCarbonInventory, "lines"> {
  return mapBaseCarbonInventory(item);
}
