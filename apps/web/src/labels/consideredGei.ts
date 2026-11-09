import { REDUCTION_PROJECT_CONSIDERED_GEI } from "@repo/constants";
import type { ConsideredGei } from "@repo/types";

/** Name + formula of each considered GEI code of a reduction project. */
export const CONSIDERED_GEI_LABELS: Record<ConsideredGei, string> = {
  CO2: "Dióxido de carbono (CO₂)",
  CH4: "Metano (CH₄)",
  N2O: "Óxido nitroso (N₂O)",
  HFC: "Hidrofluorocarbonos (HFC)",
  PFC: "Perfluorocarbonos (PFC)",
  SF6: "Hexafluoruro de azufre (SF₆)",
  NF3: "Trifluoruro de nitrógeno (NF₃)",
};

export const getConsideredGeiLabel = (code: ConsideredGei): string =>
  CONSIDERED_GEI_LABELS[code] ?? code;

/**
 * Joins the labels of the given codes in the fixed order of
 * `REDUCTION_PROJECT_CONSIDERED_GEI`, whatever order they were stored in.
 */
export const formatConsideredGei = (codes: readonly ConsideredGei[]): string =>
  REDUCTION_PROJECT_CONSIDERED_GEI.filter((code) => codes.includes(code))
    .map(getConsideredGeiLabel)
    .join(", ");
