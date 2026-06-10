import { capitalize } from "@mui/material";
import {
  SubmissionEventType,
  SubmissionHistoryEntry,
  SubmissionType,
} from "@repo/types";
import { VOCAB } from "../config/vocab";

export const EVENT_TYPE_LABEL: Record<SubmissionEventType, string> = {
  [SubmissionEventType.POSTULATION]: "POSTULACIÓN",
  [SubmissionEventType.SELF_DECLARATION]: "AUTODECLARADA",
  [SubmissionEventType.ON_REVIEW]: "EN REVISIÓN",
  [SubmissionEventType.APPROVED]: "APROBADA",
  [SubmissionEventType.APPROVED_AUTOMATICALLY]: "OTORGADO",
  [SubmissionEventType.REJECTED]: "RECHAZADA",
  [SubmissionEventType.REVIEWED]: "CON OBSERVACIONES",
};

export const getPostulationLabel = (
  submissionType: SubmissionType,
  automatic = false
): string => {
  const prefix = automatic ? "POSTULACIÓN AUTOMÁTICA" : "POSTULACIÓN";
  switch (submissionType) {
    case SubmissionType.CARBON_INVENTORY_VERIFICATION:
      return `${prefix} A RECONOCIMIENTO DE VERIFICACIÓN`;
    case SubmissionType.CARBON_INVENTORY_CALCULATION:
      return `${prefix} A RECONOCIMIENTO DE MEDICIÓN`;
    case SubmissionType.ORGANIZATION_ACCREDITATION:
      return `${prefix} A ${VOCAB.inscription.noun.singular} ${VOCAB.organization.noun.singular}`.toUpperCase();
    case SubmissionType.REDUCTION_PROJECT_VERIFICATION:
      return `${prefix} A RECONOCIMIENTO DE REDUCCIÓN`;
    case SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION:
      return `${prefix} A RECONOCIMIENTO DE NEUTRALIZACIÓN`;
    default:
      return prefix;
  }
};

export const getEventLabel = (entry: SubmissionHistoryEntry): string => {
  return EVENT_TYPE_LABEL[entry.eventType] ?? entry.eventType;
};

const REVIEW_TITLE_MAP: Partial<Record<SubmissionType, string>> = {
  [SubmissionType.ORGANIZATION_ACCREDITATION]: `a ${capitalize(VOCAB.inscription.noun.singular)} de ${VOCAB.organization.noun.singular}`,
  [SubmissionType.CARBON_INVENTORY_CALCULATION]:
    "al Reconocimiento de medición",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]:
    "al Reconocimiento de verificación",
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]:
    "al Reconocimiento de reducción",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]:
    "al Reconocimiento de neutralización",
};

export const getReviewTitle = (type?: SubmissionType): string => {
  if (!type) return "Solicitud";
  return `Revisión de la postulación ${REVIEW_TITLE_MAP[type] ?? ""}`.trim();
};
