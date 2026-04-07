import type { ConsideredGei, GwpSource } from "@repo/types";

export const GWP_OPTIONS: { label: string; value: GwpSource }[] = [
  { label: "IPCC AR4", value: "IPCC_AR4" },
  { label: "IPCC AR5", value: "IPCC_AR5" },
  { label: "IPCC AR6", value: "IPCC_AR6" },
];

export const GEI_ITEMS: { label: string; value: ConsideredGei }[] = [
  { label: "CO2", value: "CO2" },
  { label: "CH4", value: "CH4" },
  { label: "Hidrofluorocarbonados", value: "HFC" },
  { label: "Perfluorocarbonados", value: "PFC" },
  { label: "SF6", value: "SF6" },
  { label: "NF3", value: "NF3" },
];
