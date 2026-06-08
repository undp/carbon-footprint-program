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
  },
  [CarbonInventoryDisplayStatusEnum.SELF_DECLARED]: {
    family: StatusFamily.NEUTRAL,
    label: "Autodeclarada",
    tooltip: "Huella autodeclarada",
  },
  [CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION]: {
    family: StatusFamily.IN_REVIEW,
    label: "En revisión",
    tooltip: "En revisión - Reconocimiento de medición",
  },
  [CarbonInventoryDisplayStatusEnum.CALCULATION_REVIEWED]: {
    family: StatusFamily.ACTION_REQUIRED,
    label: "Con observaciones",
    tooltip: "Con observaciones - Reconocimiento de medición",
  },
  [CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED]: {
    family: StatusFamily.NEGATIVE,
    label: "Rechazado",
    tooltip: "Rechazado - Reconocimiento de medición",
  },
  [CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED]: {
    family: StatusFamily.POSITIVE,
    label: "Aprobado",
    tooltip: "Aprobado - Reconocimiento de medición",
  },
  [CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION]: {
    family: StatusFamily.IN_REVIEW,
    label: "En revisión",
    tooltip: "En revisión - Reconocimiento de verificación",
  },
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED]: {
    family: StatusFamily.ACTION_REQUIRED,
    label: "Con observaciones",
    tooltip: "Con observaciones - Reconocimiento de verificación",
  },
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED]: {
    family: StatusFamily.NEGATIVE,
    label: "Rechazado",
    tooltip: "Rechazado - Reconocimiento de verificación",
  },
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED]: {
    family: StatusFamily.POSITIVE,
    label: "Aprobado",
    tooltip: "Aprobado - Reconocimiento de verificación",
  },
  [CarbonInventoryDisplayStatusEnum.DELETED]: {
    family: StatusFamily.NEUTRAL,
    label: "Eliminado",
    tooltip: "Huella eliminada",
  },
};
