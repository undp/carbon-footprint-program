import { SubmissionStatus } from "@repo/types";
import { StatusConfig, StatusFamily } from "./types";
import { sortOrderByKey } from "@/utils/dataGrid";

export const SUBMISSION_STATUS_CONFIG = {
  [SubmissionStatus.PENDING]: {
    family: StatusFamily.IN_REVIEW,
    label: "Pendiente",
    tooltip: "Solicitud pendiente de revisión",
    sortOrder: 0,
  },

  [SubmissionStatus.REVIEWED]: {
    family: StatusFamily.ACTION_REQUIRED,
    label: "Con Observaciones",
    tooltip: "Solicitud devuelta con observaciones",
    sortOrder: 1,
  },
  [SubmissionStatus.APPROVED]: {
    family: StatusFamily.POSITIVE,
    label: "Aprobada",
    tooltip: "Solicitud aprobada",
    sortOrder: 2,
  },
  [SubmissionStatus.APPROVED_AUTOMATICALLY]: {
    family: StatusFamily.POSITIVE,
    label: "Otorgado",
    tooltip: "Reconocimiento otorgado automáticamente",
    sortOrder: 3,
  },
  [SubmissionStatus.REJECTED]: {
    family: StatusFamily.NEGATIVE,
    label: "Rechazada",
    tooltip: "Solicitud rechazada",
    sortOrder: 4,
  },
} satisfies Record<SubmissionStatus, StatusConfig>;

export const SUBMISSION_STATUS_SORT_ORDER = sortOrderByKey(
  SUBMISSION_STATUS_CONFIG
);
