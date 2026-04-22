import { BadgeType } from "@repo/types";
import { VOCAB } from "@/config/vocab";

export const BADGE_TYPE_LABELS: Record<BadgeType, string> = {
  [BadgeType.ORGANIZATION_ACCREDITATION]: `Reconocimiento de ${VOCAB.inscription.noun.singular}`,
  [BadgeType.CARBON_INVENTORY_CALCULATION]: "Reconocimiento de medición",
  [BadgeType.CARBON_INVENTORY_VERIFICATION]: "Reconocimiento de verificación",
  [BadgeType.REDUCTION_PROJECT_VERIFICATION]: "Reconocimiento de reducción",
  [BadgeType.NEUTRALIZATION_PLAN_VERIFICATION]:
    "Reconocimiento de neutralización",
};

export const BADGE_UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  BADGE_UPLOAD_VALIDATION_ERROR:
    "Archivo inválido (tipo o tamaño no permitido)",
};
