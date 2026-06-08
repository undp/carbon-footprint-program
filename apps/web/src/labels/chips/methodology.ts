import { MethodologyVersionStatus } from "@repo/types";
import { StatusConfig, StatusFamily } from "./types";

export const METHODOLOGY_STATUS_CONFIG: Record<
  MethodologyVersionStatus,
  StatusConfig
> = {
  [MethodologyVersionStatus.PUBLISHED]: {
    family: StatusFamily.POSITIVE,
    label: "Activa",
    tooltip: "Metodología publicada y disponible",
  },
  [MethodologyVersionStatus.UNPUBLISHED]: {
    family: StatusFamily.NEUTRAL,
    label: "Inactiva",
    tooltip: "Metodología no publicada",
  },
  [MethodologyVersionStatus.DELETED]: {
    family: StatusFamily.NEUTRAL,
    label: "Eliminada",
    tooltip: "Metodología eliminada",
  },
};
