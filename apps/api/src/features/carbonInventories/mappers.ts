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

/**
 * Resolved `{ id, name }` references for the catalog entities referenced by the
 * inventory's `organizationData` snapshot. Passed in by services that fetched the rows
 * by id (including DELETED rows) so the response carries names for the FE selector
 * union helper.
 */
export type InventoryOrganizationDataReferences = {
  sector: { id: string; name: string } | null;
  subsector: { id: string; name: string } | null;
  size: { id: string; name: string } | null;
  mainActivity: { id: string; name: string } | null;
};

const EMPTY_REFERENCES: InventoryOrganizationDataReferences = {
  sector: null,
  subsector: null,
  size: null,
  mainActivity: null,
};

function mapBaseCarbonInventory(
  item: PrismaCarbonInventory,
  references: InventoryOrganizationDataReferences = EMPTY_REFERENCES
): Omit<
  GetCarbonInventoryByIdResponse,
  "status" | "subcategories" | "organizationName" | "recognitions"
> {
  // The Prisma JSON column does not store the resolved {id, name} pairs — those are
  // injected here via `references` (or fall back to null if the caller did not resolve
  // them). Strip any incoming `sector`/`subsector`/`size`/`mainActivity` so the JSON
  // column never overrides what the caller passes in.
  const rawJson = (item.organizationData ?? null) as
    | (Record<string, unknown> & {
        sector?: unknown;
        subsector?: unknown;
        size?: unknown;
        mainActivity?: unknown;
      })
    | null;
  const stripped = rawJson
    ? (() => {
        const {
          sector: _s,
          subsector: _ss,
          size: _sz,
          mainActivity: _ma,
          ...rest
        } = rawJson;
        return {
          ...rest,
          sector: references.sector,
          subsector: references.subsector,
          size: references.size,
          mainActivity: references.mainActivity,
        };
      })()
    : null;

  // Validate the merged organizationData shape with runtime type checking via Zod.
  const organizationDataResult =
    OrganizationDataFieldSchema.safeParse(stripped);

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
  subcategories: SubcategoryWithDimensions[],
  references: InventoryOrganizationDataReferences = EMPTY_REFERENCES
): Omit<
  GetCarbonInventoryByIdResponse,
  "status" | "organizationName" | "recognitions"
> {
  const base = mapBaseCarbonInventory(item, references);
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
  item: PrismaCarbonInventory,
  references: InventoryOrganizationDataReferences = EMPTY_REFERENCES
): Omit<
  GetCarbonInventoryByIdResponse,
  "status" | "subcategories" | "organizationName" | "recognitions"
> {
  return mapBaseCarbonInventory(item, references);
}
