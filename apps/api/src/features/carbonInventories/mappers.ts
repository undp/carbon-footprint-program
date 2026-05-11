import type { Prisma } from "@repo/database";
import type { CarbonInventory as PrismaCarbonInventory } from "@repo/database";
import type { GetCarbonInventoryByIdResponse } from "@repo/types";
import {
  FileStatus,
  OrganizationDataFieldSchema,
  UsageMode,
} from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";
import { groupBy } from "lodash-es";
import { toNumberOrNull, kgToTon } from "@/utils/number.js";

// Prisma type for carbon inventory with lines, inputs, factors, and files
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
        files: {
          include: {
            file: {
              select: {
                id: true;
                uuid: true;
                originalName: true;
                mimeType: true;
                sizeBytes: true;
                createdAt: true;
                status: true;
              };
            };
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

  const files = (line.files ?? [])
    .filter((entry) => entry.file?.status === FileStatus.ACTIVE)
    .map((entry) => ({
      id: entry.file.id.toString(),
      uuid: entry.file.uuid,
      originalName: entry.file.originalName,
      mimeType: entry.file.mimeType,
      sizeBytes: entry.file.sizeBytes,
      createdAt: entry.file.createdAt.toISOString(),
    }));

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
    files,
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

function mapBaseCarbonInventory(
  item: PrismaCarbonInventory,
  references?: InventoryOrganizationDataReferences
): Omit<
  GetCarbonInventoryByIdResponse,
  "status" | "subcategories" | "organizationName" | "recognitions"
> {
  // The Prisma JSON column may already carry resolved `{id, name}` snapshots from
  // earlier writes. Callers that re-resolve catalog rows (including DELETED ones) pass
  // them in via `references` so the response always reflects the freshest names.
  // When `references` is omitted — or any individual entry is null/undefined — fall
  // back to the snapshot persisted in the JSON column so existing inventories are not
  // stripped of their stored data.
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
          sector: rawSector,
          subsector: rawSubsector,
          size: rawSize,
          mainActivity: rawMainActivity,
          ...rest
        } = rawJson;
        return {
          ...rest,
          sector: references?.sector ?? rawSector ?? null,
          subsector: references?.subsector ?? rawSubsector ?? null,
          size: references?.size ?? rawSize ?? null,
          mainActivity: references?.mainActivity ?? rawMainActivity ?? null,
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
  references?: InventoryOrganizationDataReferences
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
  references?: InventoryOrganizationDataReferences
): Omit<
  GetCarbonInventoryByIdResponse,
  "status" | "subcategories" | "organizationName" | "recognitions"
> {
  return mapBaseCarbonInventory(item, references);
}
