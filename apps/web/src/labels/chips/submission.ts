import { SubmissionStatus } from "@repo/types";
import { sortOrderByKey, StatusConfig, StatusFamily } from "./types";

export const SUBMISSION_STATUS_CONFIG: Record<SubmissionStatus, StatusConfig> =
  {
    [SubmissionStatus.PENDING]: {
      family: StatusFamily.IN_REVIEW,
      label: "Pendiente",
      tooltip: "Solicitud pendiente de revisión por parte del administrador",
      sortOrder: 0,
    },
    [SubmissionStatus.APPROVED]: {
      family: StatusFamily.POSITIVE,
      label: "Aprobada",
      tooltip: "Solicitud aprobada por el administrador",
      sortOrder: 1,
    },
    [SubmissionStatus.REVIEWED]: {
      family: StatusFamily.ACTION_REQUIRED,
      label: "Con Observaciones",
      tooltip: "El administrador devolvió la solicitud con observaciones",
      sortOrder: 2,
    },
    [SubmissionStatus.REJECTED]: {
      family: StatusFamily.NEGATIVE,
      label: "Rechazada",
      tooltip: "Solicitud rechazada por el administrador",
      sortOrder: 3,
    },
    [SubmissionStatus.APPROVED_AUTOMATICALLY]: {
      family: StatusFamily.POSITIVE,
      label: "Otorgado",
      tooltip: "Reconocimiento otorgado automáticamente",
      sortOrder: 4,
    },
  };

export const SUBMISSION_STATUS_SORT_ORDER = sortOrderByKey(
  SUBMISSION_STATUS_CONFIG
);
