import type { PrismaClient } from "@repo/database";
import type { GetEmissionFactorsResponse } from "@repo/types";
import { fetchInventory } from "../resultsShared.js";

export const getEmissionFactorsService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetEmissionFactorsResponse> => {
  const inventory = await fetchInventory(prismaClient, id);

  const lines = await prismaClient.carbonInventoryLine.findMany({
    where: { carbonInventoryId: inventory.id, status: "ACTIVE" },
    include: {
      subcategory: {
        select: {
          name: true,
          category: { select: { name: true, synonyms: true, position: true } },
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

  for (const line of lines) {
    const input = line.inputs[0];
    if (!input) continue;

    const factor = input.factor;
    const emissionFactor = factor?.emissionFactor;

    // Determine factor value: prefer lineFactor, fall back to manual input
    const hasLineFactor = factor != null;
    const hasManualFactor = input.manualFactor != null;
    if (!hasLineFactor && !hasManualFactor) continue;

    const activityParameter =
      [input.selection1?.value, input.selection2?.value]
        .filter(Boolean)
        .join(" / ") || line.subcategory.name;

    const rateUnit = hasLineFactor
      ? (factor.appliedFactorRateUnit?.abbreviation ??
        emissionFactor?.rateMeasurementUnit?.abbreviation ??
        "")
      : (input.manualFactorRateUnit?.abbreviation ?? "");

    const factorValue = hasLineFactor
      ? Number(factor.appliedFactorValue)
      : Number(input.manualFactor);
    const factorLabel = `${formatFactorValue(factorValue)} ${rateUnit}`;

    // Parse gasDetails to build breakdown lines
    const gasBreakdownLines = emissionFactor
      ? buildGasBreakdownLines(emissionFactor.gasDetails, rateUnit)
      : [];

    // Build source detail from the emission factor source or manual factor source
    const source =
      emissionFactor?.source ??
      factor?.appliedFactorSource ??
      input.manualFactorSource ??
      "";
    const { factorSource, factorSourceDetail } = parseFactorSource(source);

    result.push({
      categoryName: line.subcategory.category.name,
      categorySynonyms: line.subcategory.category.synonyms,
      categoryPosition: line.subcategory.category.position,
      subcategoryName: line.subcategory.name,
      activityParameter,
      factorLabel,
      gasBreakdownLines,
      factorSource,
      factorSourceDetail,
    });
  }

  return result;
};

function formatFactorValue(value: number): string {
  // Format with reasonable precision, removing trailing zeros
  if (value === 0) return "0";
  if (Math.abs(value) >= 1) {
    return value.toLocaleString("es-CL", {
      maximumFractionDigits: 4,
      useGrouping: true,
    });
  }
  return value.toLocaleString("es-CL", {
    maximumSignificantDigits: 4,
    useGrouping: true,
  });
}

function buildGasBreakdownLines(
  gasDetails: unknown,
  rateUnit: string
): string[] {
  if (
    !gasDetails ||
    typeof gasDetails !== "object" ||
    Object.keys(gasDetails).length === 0
  ) {
    return [];
  }

  const details = gasDetails as Record<string, unknown>;
  const lines: string[] = [];

  // Common gas field mappings
  const gasFields: Array<{ key: string; label: string }> = [
    { key: "co2", label: "CO₂" },
    { key: "co2Fossil", label: "CO₂" },
    { key: "ch4", label: "CH4" },
    { key: "n2o", label: "N₂O" },
    { key: "hfc", label: "HFC" },
    { key: "pfc", label: "PFC" },
    { key: "sf6", label: "SF6" },
    { key: "nf3", label: "NF3" },
  ];

  for (const { key, label } of gasFields) {
    const val = details[key];
    if (val !== undefined && val !== null && val !== 0) {
      const numVal = Number(val);
      if (Number.isFinite(numVal) && numVal !== 0) {
        lines.push(
          `${formatFactorValue(numVal)} kg CO₂e of ${label}/${extractDenominator(rateUnit)}`
        );
      }
    }
  }

  return lines;
}

function extractDenominator(rateUnit: string): string {
  // rateUnit is like "kgCO2e/ton" or "kgCO2e/lt"
  const parts = rateUnit.split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : rateUnit;
}

function parseFactorSource(source: string): {
  factorSource: string;
  factorSourceDetail: string | null;
} {
  // Source format may be "DEFRA 2025" or "DEFRA 2025 - Fuels - Coal (industrial) - tonnes"
  // Split on first " - " to separate main source from detail
  const separatorIdx = source.indexOf(" - ");
  if (separatorIdx === -1) {
    return { factorSource: source, factorSourceDetail: null };
  }
  return {
    factorSource: source.substring(0, separatorIdx).trim(),
    factorSourceDetail: source.substring(separatorIdx + 3).trim(),
  };
}
