import { REDUCTION_PROJECT_CONSIDERED_GEI } from "@repo/constants";
import { GwpSourceEnum, type ConsideredGei, type GwpSource } from "@repo/types";
import { CONSIDERED_GEI_LABELS } from "@/labels/gei";

export const GWP_OPTIONS: { label: string; value: GwpSource }[] = [
  { label: "IPCC AR4", value: GwpSourceEnum.IPCC_AR4 },
  { label: "IPCC AR5", value: GwpSourceEnum.IPCC_AR5 },
  { label: "IPCC AR6", value: GwpSourceEnum.IPCC_AR6 },
];

export const GEI_ITEMS: { label: string; value: ConsideredGei }[] =
  REDUCTION_PROJECT_CONSIDERED_GEI.map((value) => ({
    label: CONSIDERED_GEI_LABELS[value],
    value,
  }));

export const REDUCTION_PROJECT_EXPLANATION_SLUGS = {
  MAIN: "reduction-project",
  BASIS: "reduction-project-basis",
  GWP: "reduction-project-gwp",
  GEI_CONSIDERED: "reduction-project-gei-considered",
  REPORTED_ELSEWHERE: "reduction-project-reported-elsewhere",
} as const;
