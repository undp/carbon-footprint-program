import {
  CarbonInventoryDisplayStatus,
  CarbonInventoryDisplayStatusEnum,
} from "@repo/types";
import { StatusConfig, StatusFamily } from "./types";

export const CARBON_INVENTORY_STATUS_CONFIG: Record<
  CarbonInventoryDisplayStatus,
  StatusConfig
> = {
  [CarbonInventoryDisplayStatusEnum.DRAFT]: {
    family: StatusFamily.NEUTRAL,
    label: "Borrador",
    tooltip: "En Borrador",
    sortOrder: 0,
  },
  [CarbonInventoryDisplayStatusEnum.SELF_DECLARED]: {
    family: StatusFamily.NEUTRAL,
    label: "Autodeclarada",
    tooltip: "Huella autodeclarada",
    sortOrder: 1,
  },
  [CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION]: {
    family: StatusFamily.IN_REVIEW,
    label: "En revisión",
    tooltip: "En revisión - Reconocimiento de medición",
    sortOrder: 2,
  },
  [CarbonInventoryDisplayStatusEnum.CALCULATION_REVIEWED]: {
    family: StatusFamily.ACTION_REQUIRED,
    label: "Con observaciones",
    tooltip: "Con observaciones - Reconocimiento de medición",
    sortOrder: 3,
  },
  [CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED]: {
    family: StatusFamily.NEGATIVE,
    label: "Rechazado",
    tooltip: "Rechazado - Reconocimiento de medición",
    sortOrder: 4,
  },
  [CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED]: {
    family: StatusFamily.POSITIVE,
    label: "Aprobado",
    tooltip: "Aprobado - Reconocimiento de medición",
    sortOrder: 5,
  },
  [CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION]: {
    family: StatusFamily.IN_REVIEW,
    label: "En revisión",
    tooltip: "En revisión - Reconocimiento de verificación",
    sortOrder: 6,
  },
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED]: {
    family: StatusFamily.ACTION_REQUIRED,
    label: "Con observaciones",
    tooltip: "Con observaciones - Reconocimiento de verificación",
    sortOrder: 7,
  },
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED]: {
    family: StatusFamily.NEGATIVE,
    label: "Rechazado",
    tooltip: "Rechazado - Reconocimiento de verificación",
    sortOrder: 8,
  },
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED]: {
    family: StatusFamily.POSITIVE,
    label: "Aprobado",
    tooltip: "Aprobado - Reconocimiento de verificación",
    sortOrder: 9,
  },
  [CarbonInventoryDisplayStatusEnum.DELETED]: {
    family: StatusFamily.NEUTRAL,
    label: "Eliminado",
    tooltip: "Huella eliminada",
    sortOrder: 10,
  },
};
