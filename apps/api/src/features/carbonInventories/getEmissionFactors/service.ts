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
  const seenAppliedVintages = new Set<string>();

  for (const line of lines) {
    const input = line.inputs[0];
    if (!input) continue;

    const factor = input.factor;
    const emissionFactor = factor?.emissionFactor;

    // What the summary lists is an applied vintage, not a catalog row: the year
    // and the value are snapshotted per line, so two lines can hold two
    // vintages of the same factor after a maintainer re-dates it. Deduplicating
    // on the catalog id alone would drop one of them, and with it its year
    // warning.
    const appliedVintageKey = emissionFactor
      ? [
          emissionFactor.id.toString(),
          factor?.appliedFactorYear ?? "",
          factor?.appliedFactorValue.toString() ?? "",
        ].join("-")
      : null;

    if (appliedVintageKey !== null) {
      if (seenAppliedVintages.has(appliedVintageKey)) continue;
      seenAppliedVintages.add(appliedVintageKey);
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

    // The line's own snapshot comes first, for the same reason the applied year
    // does: the catalog row may have been renamed since, and pairing today's
    // provider with the vintage that was applied describes a factor that never
    // existed. The catalog row is only a fallback for rows saved before the
    // snapshot existed.
    const source =
      factor?.appliedFactorSource ??
      emissionFactor?.source ??
      input.manualFactorSource ??
      "";
    const { factorSource, factorSourceDetail } = parseFactorSource(source);

    // One row per applied vintage, so the id has to carry the vintage too;
    // manual factors stay keyed on their line.
    const rowId = appliedVintageKey ?? `manual-${line.id}`;

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
      // Read from the line's own snapshot, not from the catalog row: the catalog
      // may have been edited since, and the summary has to show the vintage that
      // was actually applied. Null for transversal and custom factors, which is
      // what stops them from being styled as a mismatch.
      appliedFactorYear: factor?.appliedFactorYear ?? null,
      factorSourceDetail,
    });
  }

  return result;
};
