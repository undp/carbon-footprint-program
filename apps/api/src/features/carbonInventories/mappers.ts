import type { Prisma } from "@repo/database";
import type { CarbonInventory as PrismaCarbonInventory } from "@repo/database";
import type { GetCarbonInventoryByIdResponse } from "@repo/types";
import { OrganizationDataFieldSchema, UsageMode } from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";
import { groupBy } from "lodash-es";
import { toNumberOrNull, kgToTon } from "@/utils/number.js";

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

type SubcategoryWithDimensions = Prisma.SubcategoryGetPayload<{
  select: {
    id: true;
    dimensions: {
      select: {
        id: true;
      };
    };
  };
}>;

// Helper type for a line with inputs
export type LineWithInputs = NonNullable<
  CarbonInventoryWithLines["lines"]
>[number];

type LineResponse =
  GetCarbonInventoryByIdResponse["subcategories"][number]["lines"][number];

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
  const quantity = toNumberOrNull(activeInput?.quantity) ?? null;

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

  const rawManualTotalEmissions =
    toNumberOrNull(activeInput?.directTotalEmissions) ?? null;
  const manualTotalEmissions =
    rawManualTotalEmissions !== null ? kgToTon(rawManualTotalEmissions) : null;

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
): Omit<
  GetCarbonInventoryByIdResponse,
  "status" | "subcategories" | "organizationName"
> {
  // Validate organizationData with runtime type checking using Zod
  const organizationDataResult = OrganizationDataFieldSchema.safeParse(
    item.organizationData
  );

  if (!organizationDataResult.success)
    throw new DataIntegrityError(
      `Invalid organizationData structure for carbon inventory ${item.id}: ${organizationDataResult.error.message}`
    );

  return {
    id: item.id.toString(),
    uuid: item.uuid,
    name: item.name ?? null,
    organizationId: item.organizationId?.toString() ?? null,
    organizationBranchId: item.organizationBranchId?.toString() ?? null,
    organizationData: organizationDataResult.data,
    year: item.year,
    usageMode: item.usageMode,
    methodologyVersionId: item.methodologyVersionId?.toString() ?? null,
    preselectedNodesId: item.preselectedNodesId?.toString() ?? null,
    isEditable: item.isEditable,
    isSelfDeclared: item.isSelfDeclared,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt?.toISOString() ?? null,
    selfDeclaredAt: item.selfDeclaredAt?.toISOString() ?? null,
    createdById: item.createdById?.toString() ?? null,
    updatedById: item.updatedById?.toString() ?? null,
  };
}

// Map carbon inventory with subcategories to response (includes subcategories field)
export function mapCarbonInventoryWithLinesToResponse(
  item: CarbonInventoryWithLines,
  subcategories: SubcategoryWithDimensions[]
): Omit<GetCarbonInventoryByIdResponse, "status" | "organizationName"> {
  const base = mapBaseCarbonInventory(item);
  const parsedLines: LineResponse[] = item.lines.map(mapLineToResponse);

  const linesBySubcategoryId = groupBy<LineResponse>(
    parsedLines,
    "subcategoryId"
  );

  const subcategoryById = Object.fromEntries(
    subcategories.map((subcategory) => [subcategory.id.toString(), subcategory])
  );

  return {
    ...base,
    subcategories: Object.entries(linesBySubcategoryId).map(
      ([subcategoryId, lines]) => {
        const subcategoryHasDimensions =
          !!subcategoryById[subcategoryId]?.dimensions?.length;

        // isTotalManualEmissionsModeActive is true if all lines in the subcategory use manual total emissions
        const isTotalManualEmissionsModeActive =
          lines.length > 0 &&
          lines.every((line) => line.isManualTotalEmissions === true);

        return {
          id: subcategoryId,
          isTotalManualEmissionsModeAvailable:
            base.usageMode === UsageMode.EXPERT || !subcategoryHasDimensions, // Available in expert mode
          isTotalManualEmissionsModeActive,
          lines,
        };
      }
    ),
  };
}

// Map carbon inventory without subcategories, organizationName, and status to responses
export function mapCarbonInventoryToResponse(
  item: PrismaCarbonInventory
): Omit<
  GetCarbonInventoryByIdResponse,
  "status" | "subcategories" | "organizationName"
> {
  return mapBaseCarbonInventory(item);
}
