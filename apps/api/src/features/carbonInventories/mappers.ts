import type { Prisma } from "@repo/database";
import type { CarbonInventory as PrismaCarbonInventory } from "@repo/database";
import type { CarbonInventory as ResponseCarbonInventory } from "@repo/types";
import { OrganizationDataSchema } from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";
import { groupBy } from "lodash-es";
import { toNumberOrNull } from "@/utils/number.js";

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

type LineResponse =
  ResponseCarbonInventory["subcategories"][number]["lines"][number];

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
): Omit<ResponseCarbonInventory, "subcategories"> {
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

// Map carbon inventory with subcategories to response (includes subcategories field)
export function mapCarbonInventoryWithLinesToResponse(
  item: CarbonInventoryWithLines
): ResponseCarbonInventory {
  const base = mapBaseCarbonInventory(item);
  const parsedLines: LineResponse[] = item.lines.map(mapLineToResponse);

  const linesBySubcategoryId = groupBy<LineResponse>(
    parsedLines,
    "subcategoryId"
  );

  return {
    ...base,
    subcategories: Object.entries(linesBySubcategoryId).map(
      ([subcategoryId, lines]) => {
        // isTotalManualEmissionsMode is true if all lines in the subcategory use manual total emissions
        const isTotalManualEmissionsMode =
          lines.length > 0 &&
          lines.every((line) => line.isManualTotalEmissions === true);

        return {
          id: subcategoryId,
          isTotalManualEmissionsMode,
          lines,
        };
      }
    ),
  };
}

// Map carbon inventory without subcategories to response (omits subcategories field)
export function mapCarbonInventoryToResponse(
  item: PrismaCarbonInventory
): Omit<ResponseCarbonInventory, "subcategories"> {
  return mapBaseCarbonInventory(item);
}
