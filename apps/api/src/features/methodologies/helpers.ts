import {
  CategoryStatus,
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
  SubcategoryStatus,
  type Prisma,
  type PrismaClient,
} from "@repo/database";
import type { MethodologyExportPayload } from "./mappers.js";

/**
 * Full Prisma select tree for a methodology export. Shared by the admin
 * (`GET /methodologies/:id/export`) and user-scoped
 * (`GET /carbon-inventories/:id/methodology-export`) endpoints to guarantee
 * a byte-identical response shape — drift would mean the same workbook
 * looks different depending on which endpoint produced it.
 *
 * `emissionFactorYear` narrows the factors to one footprint year, so the
 * workbook of a footprint lists what its capture screen offers instead of
 * every year the catalogue holds. `null` means the whole catalogue, and both
 * callers that pass it mean it: the admin export documents the catalogue
 * itself, and a footprint with no year yet has no capture screen to disagree
 * with — emptying its workbook would document nothing. That is why this
 * differs from `getCarbonInventoryMethodology`, where an undated footprint is
 * offered nothing: a selector offering an unusable factor is a defect, a
 * document listing one is context.
 */
const buildMethodologyExportSelect = (emissionFactorYear: number | null) =>
  ({
    id: true,
    name: true,
    description: true,
    regulation: true,
    version: true,
    status: true,
    categories: {
      where: { status: CategoryStatus.ACTIVE },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        position: true,
        synonyms: true,
        description: true,
        subcategories: {
          where: { status: SubcategoryStatus.ACTIVE },
          orderBy: { position: "asc" },
          select: {
            id: true,
            name: true,
            position: true,
            description: true,
            subcategoryMeasurementUnits: {
              select: {
                measurementUnit: {
                  select: {
                    id: true,
                    name: true,
                    abbreviation: true,
                  },
                },
              },
            },
            dimensions: {
              where: { status: EmissionFactorDimensionStatus.ACTIVE },
              orderBy: { position: "asc" },
              select: {
                id: true,
                name: true,
                position: true,
                isRequired: true,
                values: {
                  where: {
                    status: EmissionFactorDimensionValueStatus.ACTIVE,
                  },
                  orderBy: { value: "asc" },
                  select: { id: true, value: true },
                },
              },
            },
            emissionFactors: {
              where: {
                status: EmissionFactorStatus.ACTIVE,
                ...(emissionFactorYear !== null
                  ? { year: emissionFactorYear }
                  : {}),
              },
              select: {
                id: true,
                source: true,
                value: true,
                year: true,
                gasDetails: true,
                dimensionValue1: { select: { id: true, value: true } },
                dimensionValue2: { select: { id: true, value: true } },
                rateMeasurementUnit: {
                  select: { id: true, name: true, abbreviation: true },
                },
              },
            },
          },
        },
      },
    },
  }) satisfies Prisma.MethodologyVersionSelect;

/**
 * Finds the methodology version that matches `where` and selects the full
 * export hierarchy. Returns `null` when no row matches — callers decide
 * what error to surface (e.g. `MethodologyNotFoundError`).
 *
 * `emissionFactorYear` is explicit at every call site rather than defaulted:
 * exporting the catalogue of every year is a decision, not an oversight.
 */
export async function findMethodologyExportByVersionId(
  prisma: PrismaClient,
  where: Prisma.MethodologyVersionWhereInput,
  emissionFactorYear: number | null
): Promise<MethodologyExportPayload | null> {
  return prisma.methodologyVersion.findFirst({
    where,
    select: buildMethodologyExportSelect(emissionFactorYear),
  });
}
