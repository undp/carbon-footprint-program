import { REDUCTION_PROJECT_CONSIDERED_GEI } from "@repo/constants";
import type { ConsideredGei } from "@repo/types";

/** Spanish name of each greenhouse gas (GEI). */
export const GEI_NAMES: Record<ConsideredGei, string> = {
  CO2: "Dióxido de carbono",
  CH4: "Metano",
  N2O: "Óxido nitroso",
  HFC: "Hidrofluorocarbonos",
  PFC: "Perfluorocarbonos",
  SF6: "Hexafluoruro de azufre",
  NF3: "Trifluoruro de nitrógeno",
};

/** Chemical formula of each greenhouse gas (GEI), with subscripts. */
export const GEI_FORMULAS: Record<ConsideredGei, string> = {
  CO2: "CO₂",
  CH4: "CH₄",
  N2O: "N₂O",
  HFC: "HFC",
  PFC: "PFC",
  SF6: "SF₆",
  NF3: "NF₃",
};

/** Name + formula of each considered GEI code of a reduction project. */
export const CONSIDERED_GEI_LABELS = Object.fromEntries(
  REDUCTION_PROJECT_CONSIDERED_GEI.map((code) => [
    code,
    `${GEI_NAMES[code]} (${GEI_FORMULAS[code]})`,
  ])
) as Record<ConsideredGei, string>;

/**
 * Joins the labels of the given codes in the fixed order of
 * `REDUCTION_PROJECT_CONSIDERED_GEI`, whatever order they were stored in. The
 * API validates every stored code, so each one has a label.
 */
export const formatConsideredGei = (codes: readonly ConsideredGei[]): string =>
  REDUCTION_PROJECT_CONSIDERED_GEI.filter((code) => codes.includes(code))
    .map((code) => CONSIDERED_GEI_LABELS[code])
    .join(", ");
