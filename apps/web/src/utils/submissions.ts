import { capitalize, type Theme } from "@mui/material";
import {
  SubmissionEventType,
  SubmissionHistoryEntry,
  SubmissionStatus,
  SubmissionType,
} from "@repo/types";
import { VOCAB } from "../config/vocab";

export const REQUEST_STATUS_LABEL: Record<SubmissionStatus, string> = {
  [SubmissionStatus.PENDING]: "Pendiente",
  [SubmissionStatus.APPROVED]: "Aprobada",
  [SubmissionStatus.REVIEWED]: "Con Observaciones",
  [SubmissionStatus.REJECTED]: "Rechazada",
  [SubmissionStatus.APPROVED_AUTOMATICALLY]: "Aprobada Automáticamente",
};

export const REQUEST_TYPE_LABEL: Record<SubmissionType, string> = {
  [SubmissionType.ORGANIZATION_ACCREDITATION]: `${capitalize(VOCAB.inscription.noun.singular)} ${VOCAB.organization.noun.singular}`,
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "Diploma de Medición",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "Sello de Verificación",
  [SubmissionType.REDUCTION_PLAN_VERIFICATION]: "Sello de Reducción",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: "Sello de Neutralización",
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  [SubmissionEventType.POSTULATION]: "POSTULACIÓN",
  [SubmissionEventType.SELF_DECLARATION]: "AUTODECLARADA",
  [SubmissionEventType.ON_REVIEW]: "EN REVISIÓN",
  [SubmissionEventType.APPROVED]: "APROBADA",
  [SubmissionEventType.APPROVED_AUTOMATICALLY]: "APROBADA AUTOMÁTICAMENTE",
  [SubmissionEventType.REJECTED]: "RECHAZADA",
  [SubmissionEventType.REVIEWED]: "CON OBSERVACIONES",
};

export const getPostulationLabel = (submissionType: SubmissionType): string => {
  switch (submissionType) {
    case SubmissionType.CARBON_INVENTORY_VERIFICATION:
      return "POSTULACIÓN A SELLO DE VERIFICACIÓN";
    case SubmissionType.CARBON_INVENTORY_CALCULATION:
      return "POSTULACIÓN A DIPLOMA DE MEDICIÓN";
    case SubmissionType.ORGANIZATION_ACCREDITATION:
      return `POSTULACIÓN A ${VOCAB.inscription.noun.singular} ${VOCAB.organization.noun.singular}`.toUpperCase();
    case SubmissionType.REDUCTION_PLAN_VERIFICATION:
      return "POSTULACIÓN A SELLO DE REDUCCIÓN";
    case SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION:
      return "POSTULACIÓN A SELLO DE NEUTRALIZACIÓN";
    default:
      return "POSTULACIÓN";
  }
};

export const getEventLabel = (entry: SubmissionHistoryEntry): string => {
  if (
    entry.eventType === SubmissionEventType.POSTULATION &&
    entry.submissionType
  ) {
    return getPostulationLabel(entry.submissionType);
  }
  return EVENT_TYPE_LABEL[entry.eventType] ?? entry.eventType;
};

const REVIEW_TITLE_MAP: Partial<Record<SubmissionType, string>> = {
  [SubmissionType.ORGANIZATION_ACCREDITATION]: `a ${capitalize(VOCAB.inscription.noun.singular)} de ${VOCAB.organization.noun.singular}`,
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "al Diploma de medición",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "al Sello de verificación",
  [SubmissionType.REDUCTION_PLAN_VERIFICATION]: "al Sello de reducción",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]:
    "al Sello de neutralización",
};

export const getReviewTitle = (type?: SubmissionType): string => {
  if (!type) return "Solicitud";
  return `Revisión de la postulación ${REVIEW_TITLE_MAP[type] ?? ""}`.trim();
};

export const getRequestStatusColor = (
  status: SubmissionStatus,
  theme: Theme
): string => {
  const map: Record<SubmissionStatus, string> = {
    [SubmissionStatus.PENDING]: theme.palette.info.dark,
    [SubmissionStatus.APPROVED]: theme.palette.success.light,
    [SubmissionStatus.REVIEWED]: theme.palette.warning.light,
    [SubmissionStatus.REJECTED]: theme.palette.error.light,
    [SubmissionStatus.APPROVED_AUTOMATICALLY]: theme.palette.success.light,
  };
  return map[status];
};
