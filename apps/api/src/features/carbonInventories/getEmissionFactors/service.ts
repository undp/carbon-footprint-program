import type { PrismaClient } from "@repo/database";
import {
  CarbonInventoryLineStatus,
  EmissionFactorDimensionStatus,
  type GetEmissionFactorsResponse,
} from "@repo/types";
import { fetchInventory } from "../helpers.js";
import { buildGasBreakdownLines, parseFactorSource } from "./helper.js";

export const getEmissionFactorsService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetEmissionFactorsResponse> => {
  const inventory = await fetchInventory(prismaClient, id);

  const lines = await prismaClient.carbonInventoryLine.findMany({
    where: {
      carbonInventoryId: inventory.id,
      status: CarbonInventoryLineStatus.ACTIVE,
    },
    include: {
      subcategory: {
        select: {
          name: true,
          category: {
            select: { name: true, synonyms: true, position: true, color: true },
          },
          dimensions: {
            where: {
              status: EmissionFactorDimensionStatus.ACTIVE,
            },
            select: { position: true, isRequired: true },
          },
        },
      },
      inputs: {
        where: { isActive: true },
        take: 1,
        select: {
          selection1: { select: { value: true } },
          selection2: { select: { value: true } },
          manualFactor: true,
          manualFactorSource: true,
          manualFactorRateUnit: {
            select: {
              abbreviation: true,
            },
          },
          factor: {
            include: {
              emissionFactor: {
                select: {
                  id: true,
                  source: true,
                  value: true,
                  gasDetails: true,
                  rateMeasurementUnit: {
                    select: {
                      abbreviation: true,
                      denominatorMeasurementUnit: {
                        select: { abbreviation: true },
                      },
                    },
                  },
                },
              },
              appliedFactorRateUnit: {
                select: {
                  abbreviation: true,
                  denominatorMeasurementUnit: {
                    select: { abbreviation: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { subcategory: { category: { position: "asc" } } },
      { subcategory: { name: "asc" } },
    ],
  });

  const result: GetEmissionFactorsResponse = [];
  const seenEmissionFactorIds = new Set<bigint>();

  for (const line of lines) {
    const input = line.inputs[0];
    if (!input) continue;

    const factor = input.factor;
    const emissionFactor = factor?.emissionFactor;

    // Skip duplicate emission factors
    if (emissionFactor) {
      if (seenEmissionFactorIds.has(emissionFactor.id)) continue;
      seenEmissionFactorIds.add(emissionFactor.id);
    }

    // Determine factor value: prefer lineFactor, fall back to manual input
    const hasLineFactor = factor != null;
    const hasManualFactor = input.manualFactor != null;
    if (!hasLineFactor && !hasManualFactor) continue;

    const dim1Required = line.subcategory.dimensions.some(
      (d) => d.position === 1 && d.isRequired
    );
    const dim2Required = line.subcategory.dimensions.some(
      (d) => d.position === 2 && d.isRequired
    );

    const activityParameter =
      [
        dim1Required ? input.selection1?.value : undefined,
        dim2Required ? input.selection2?.value : undefined,
      ]
        .filter(Boolean)
        .join(" / ") || line.subcategory.name;

    const rateUnit = hasLineFactor
      ? (factor.appliedFactorRateUnit?.abbreviation ??
        emissionFactor?.rateMeasurementUnit?.abbreviation ??
        "")
      : (input.manualFactorRateUnit?.abbreviation ?? "");

    const factorValue = hasLineFactor
      ? factor.appliedFactorValue.toNumber()
      : input.manualFactor!.toNumber();

    const gasBreakdownLines = emissionFactor
      ? buildGasBreakdownLines(emissionFactor.gasDetails)
      : [];

    // Build source detail from the emission factor source or manual factor source
    const source =
      emissionFactor?.source ??
      factor?.appliedFactorSource ??
      input.manualFactorSource ??
      "";
    const { factorSource, factorSourceDetail } = parseFactorSource(source);

    // Use emission factor ID if available, otherwise use line ID for manual factors
    const rowId = emissionFactor
      ? String(emissionFactor.id)
      : `manual-${line.id}`;

    result.push({
      id: rowId,
      categoryName: line.subcategory.category.name,
      categorySynonyms: line.subcategory.category.synonyms,
      categoryPosition: line.subcategory.category.position,
      categoryColor: line.subcategory.category.color,
      subcategoryName: line.subcategory.name,
      activityParameter,
      factorValue,
      rateUnit,
      gasBreakdownLines,
      factorSource,
      factorSourceDetail,
    });
  }

  return result;
};
