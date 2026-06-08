import {
  ReductionProjectDisplayStatus,
  ReductionProjectDisplayStatusEnum,
} from "@repo/types";
import { StatusConfig, StatusFamily } from "./types";

export const REDUCTION_PROJECT_STATUS_CONFIG: Record<
  ReductionProjectDisplayStatus,
  StatusConfig
> = {
  [ReductionProjectDisplayStatusEnum.DRAFT]: {
    family: StatusFamily.NEUTRAL,
    label: "Borrador",
    tooltip: "En Borrador",
  },
  [ReductionProjectDisplayStatusEnum.SUBMITTED]: {
    family: StatusFamily.IN_REVIEW,
    label: "En revisión",
    tooltip: "En revisión - Sello de reducción",
  },
  [ReductionProjectDisplayStatusEnum.REVIEWED]: {
    family: StatusFamily.ACTION_REQUIRED,
    label: "Con observaciones",
    tooltip: "Con observaciones - Sello de reducción",
  },
  [ReductionProjectDisplayStatusEnum.REJECTED]: {
    family: StatusFamily.NEGATIVE,
    label: "Rechazado",
    tooltip: "Rechazado - Sello de reducción",
  },
  [ReductionProjectDisplayStatusEnum.APPROVED]: {
    family: StatusFamily.POSITIVE,
    label: "Aprobado",
    tooltip: "Aprobado - Sello de reducción",
  },
  [ReductionProjectDisplayStatusEnum.DELETED]: {
    family: StatusFamily.NEUTRAL,
    label: "Eliminado",
    tooltip: "Proyecto eliminado",
  },
};
