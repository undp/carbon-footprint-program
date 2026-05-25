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
    sortOrder: 0,
  },
  [ReductionProjectDisplayStatusEnum.SUBMITTED]: {
    family: StatusFamily.IN_REVIEW,
    label: "En revisión",
    tooltip: "En revisión - Sello de reducción",
    sortOrder: 1,
  },
  [ReductionProjectDisplayStatusEnum.REVIEWED]: {
    family: StatusFamily.ACTION_REQUIRED,
    label: "Con observaciones",
    tooltip: "Con observaciones - Sello de reducción",
    sortOrder: 2,
  },
  [ReductionProjectDisplayStatusEnum.REJECTED]: {
    family: StatusFamily.NEGATIVE,
    label: "Rechazado",
    tooltip: "Rechazado - Sello de reducción",
    sortOrder: 3,
  },
  [ReductionProjectDisplayStatusEnum.APPROVED]: {
    family: StatusFamily.POSITIVE,
    label: "Aprobado",
    tooltip: "Aprobado - Sello de reducción",
    sortOrder: 4,
  },
  [ReductionProjectDisplayStatusEnum.DELETED]: {
    family: StatusFamily.NEUTRAL,
    label: "Eliminado",
    tooltip: "Proyecto eliminado",
    sortOrder: 5,
  },
};
