import { formatEmissionFactor } from "@repo/utils";

export { formatEmissionFactor };

export function buildGasBreakdownLines(
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
          `${formatEmissionFactor(numVal)} kg CO₂e of ${label}/${extractDenominator(rateUnit)}`
        );
      }
    }
  }

  return lines;
}

export function extractDenominator(rateUnit: string): string {
  // rateUnit is like "kgCO2e/ton" or "kgCO2e/lt"
  const parts = rateUnit.split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : rateUnit;
}

export function parseFactorSource(source: string): {
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
