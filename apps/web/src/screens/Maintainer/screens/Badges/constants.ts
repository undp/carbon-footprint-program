import { BadgeType } from "@repo/types";

export const BADGE_TYPE_LABELS: Record<BadgeType, string> = {
  [BadgeType.ORGANIZATION_ACCREDITATION]: "Acreditación de organización",
  [BadgeType.CARBON_INVENTORY_CALCULATION]: "Cálculo de inventario de carbono",
  [BadgeType.CARBON_INVENTORY_VERIFICATION]:
    "Verificación de inventario de carbono",
  [BadgeType.REDUCTION_PROJECT_VERIFICATION]:
    "Verificación de proyecto de reducción",
  [BadgeType.NEUTRALIZATION_PLAN_VERIFICATION]:
    "Verificación de plan de neutralización",
};

export const BADGE_UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  BADGE_UPLOAD_VALIDATION_ERROR:
    "Archivo inválido (tipo o tamaño no permitido)",
};
