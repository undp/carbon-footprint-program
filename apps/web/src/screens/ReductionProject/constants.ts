import {
  ConsideredGeiEnum,
  GwpSourceEnum,
  type ConsideredGei,
  type GwpSource,
} from "@repo/types";

export const GWP_OPTIONS: { label: string; value: GwpSource }[] = [
  { label: "IPCC AR4", value: GwpSourceEnum.IPCC_AR4 },
  { label: "IPCC AR5", value: GwpSourceEnum.IPCC_AR5 },
  { label: "IPCC AR6", value: GwpSourceEnum.IPCC_AR6 },
];

export const GEI_ITEMS: { label: string; value: ConsideredGei }[] = [
  { label: "CO2", value: ConsideredGeiEnum.CO2 },
  { label: "CH4", value: ConsideredGeiEnum.CH4 },
  { label: "Hidrofluorocarbonados", value: ConsideredGeiEnum.HFC },
  { label: "Perfluorocarbonados", value: ConsideredGeiEnum.PFC },
  { label: "SF6", value: ConsideredGeiEnum.SF6 },
  { label: "NF3", value: ConsideredGeiEnum.NF3 },
];

export const REDUCTION_PROJECT_EXPLANATION_SLUGS = {
  MAIN: "reduction-project",
  BASIS: "reduction-project-basis",
  GWP: "reduction-project-gwp",
  GEI_CONSIDERED: "reduction-project-gei-considered",
  REPORTED_ELSEWHERE: "reduction-project-reported-elsewhere",
} as const;
