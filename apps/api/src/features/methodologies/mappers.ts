import type { Prisma } from "@repo/database";
import type { MethodologyVersion as PrismaMethodologyVersion } from "@repo/database";
import type {
  CreateMethodologyResponse,
  GetAllMethodologiesResponse,
  GetMethodologyExportResponse,
} from "@repo/types";
import { parseGasDetails } from "../emissionFactors/mappers.js";

// Prisma type for methodology with country and counts
type MethodologyWithCountryAndCounts = Prisma.MethodologyVersionGetPayload<{
  include: {
    country: true;
    _count: {
      select: {
        categories: true;
        carbonInventories: true;
      };
    };
  };
}>;

/**
 * Maps a Prisma MethodologyVersion to the API response format.
 */
export function mapMethodologyToResponse(
  methodology: PrismaMethodologyVersion
): CreateMethodologyResponse {
  return {
    id: methodology.id.toString(),
    countryId: methodology.countryId.toString(),
    name: methodology.name,
    description: methodology.description,
    regulation: methodology.regulation,
    version: methodology.version,
    status: methodology.status,
    createdAt: methodology.createdAt.toISOString(),
    updatedAt: methodology.updatedAt?.toISOString() ?? null,
    createdById: methodology.createdById?.toString() ?? null,
    updatedById: methodology.updatedById?.toString() ?? null,
  };
}

/**
 * Maps a Prisma MethodologyVersion with relations to the API response format.
 * Includes country info and counts for categories and carbon inventories.
 */
export function mapMethodologyWithRelationsToResponse(
  methodology: MethodologyWithCountryAndCounts
): GetAllMethodologiesResponse[number] {
  return {
    ...mapMethodologyToResponse(methodology),
    country: {
      id: methodology.country.id.toString(),
      name: methodology.country.name,
      isoCode: methodology.country.isoCode,
    },
    categoryCount: methodology._count.categories,
    carbonInventoryCount: methodology._count.carbonInventories,
  };
}

// Prisma payload type for the methodology export query — keeps the mapper
// in sync with the actual `select` shape used in the service.
export type MethodologyExportPayload = Prisma.MethodologyVersionGetPayload<{
  select: {
    id: true;
    name: true;
    description: true;
    regulation: true;
    version: true;
    status: true;
    categories: {
      select: {
        id: true;
        name: true;
        position: true;
        synonyms: true;
        description: true;
        subcategories: {
          select: {
            id: true;
            name: true;
            description: true;
            subcategoryMeasurementUnits: {
              select: {
                measurementUnit: {
                  select: {
                    id: true;
                    name: true;
                    abbreviation: true;
                  };
                };
              };
            };
            dimensions: {
              select: {
                id: true;
                name: true;
                position: true;
                isRequired: true;
                values: {
                  select: { id: true; value: true };
                };
              };
            };
            emissionFactors: {
              select: {
                id: true;
                source: true;
                value: true;
                gasDetails: true;
                dimensionValue1: { select: { id: true; value: true } };
                dimensionValue2: { select: { id: true; value: true } };
                rateMeasurementUnit: {
                  select: { id: true; name: true; abbreviation: true };
                };
              };
            };
          };
        };
      };
    };
  };
}>;

type ExportSubcategory =
  MethodologyExportPayload["categories"][number]["subcategories"][number];
type ExportDimension = ExportSubcategory["dimensions"][number];
type ExportEmissionFactor = ExportSubcategory["emissionFactors"][number];

function mapDimensionExport(
  dimension: ExportDimension
): GetMethodologyExportResponse["categories"][number]["subcategories"][number]["dimensions"][number] {
  return {
    id: dimension.id.toString(),
    name: dimension.name,
    position: dimension.position,
    isRequired: dimension.isRequired,
    values: dimension.values.map((value) => ({
      id: value.id.toString(),
      value: value.value,
    })),
  };
}

function mapEmissionFactorExport(
  factor: ExportEmissionFactor
): GetMethodologyExportResponse["categories"][number]["subcategories"][number]["emissionFactors"][number] {
  return {
    id: factor.id.toString(),
    source: factor.source,
    value: factor.value.toString(),
    gasDetails: parseGasDetails(factor.gasDetails, factor.id),
    dimensionValue1: factor.dimensionValue1
      ? {
          id: factor.dimensionValue1.id.toString(),
          value: factor.dimensionValue1.value,
        }
      : null,
    dimensionValue2: factor.dimensionValue2
      ? {
          id: factor.dimensionValue2.id.toString(),
          value: factor.dimensionValue2.value,
        }
      : null,
    rateMeasurementUnit: {
      id: factor.rateMeasurementUnit.id.toString(),
      name: factor.rateMeasurementUnit.name,
      abbreviation: factor.rateMeasurementUnit.abbreviation,
    },
  };
}

/**
 * Maps the heavy Prisma payload returned by `getMethodologyExportService` into
 * the API response shape consumed by the frontend Excel exporter.
 */
export function mapMethodologyExportToResponse(
  methodology: MethodologyExportPayload
): GetMethodologyExportResponse {
  return {
    id: methodology.id.toString(),
    name: methodology.name,
    description: methodology.description,
    regulation: methodology.regulation,
    version: methodology.version,
    status: methodology.status,
    categories: methodology.categories.map((category) => ({
      id: category.id.toString(),
      name: category.name,
      position: category.position,
      synonyms: category.synonyms,
      description: category.description,
      subcategories: category.subcategories.map((subcategory) => ({
        id: subcategory.id.toString(),
        name: subcategory.name,
        description: subcategory.description,
        measurementUnits: subcategory.subcategoryMeasurementUnits.map(
          ({ measurementUnit }) => ({
            id: measurementUnit.id.toString(),
            name: measurementUnit.name,
            abbreviation: measurementUnit.abbreviation,
          })
        ),
        dimensions: subcategory.dimensions.map(mapDimensionExport),
        emissionFactors: subcategory.emissionFactors.map(
          mapEmissionFactorExport
        ),
      })),
    })),
  };
}
