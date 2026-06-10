import { SubmissionType } from "@repo/types";
import { capitalize } from "lodash-es";
import { VOCAB } from "@/config/vocab";
import { ChipLabel } from "./types";
import { sortOrderByKey } from "@/utils/dataGrid";

// Sibling of RECOGNITION_TYPE_LABELS (./recognitionType): the four recognition
// types plus organization accreditation, with sentence-case labels and
// "Solicitud de…" tooltips for the SubmissionTypeChip. Wording intentionally
// differs from RECOGNITION_TYPE_LABELS (different surface); keep the type set in
// sync if a recognition type is added or removed.
export const SUBMISSION_TYPE_LABELS = {
  [SubmissionType.ORGANIZATION_ACCREDITATION]: {
    label: `${capitalize(VOCAB.inscription.noun.singular)} ${VOCAB.organization.noun.singular}`,
    tooltip: `Solicitud de ${VOCAB.inscription.noun.singular} de ${VOCAB.organization.noun.singular}`,
    sortOrder: 0,
  },
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: {
    label: "Reconocimiento de medición",
    tooltip: "Solicitud de reconocimiento de medición de huella",
    sortOrder: 1,
  },
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: {
    label: "Reconocimiento de verificación",
    tooltip: "Solicitud de reconocimiento de verificación de huella",
    sortOrder: 2,
  },
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: {
    label: "Reconocimiento de reducción",
    tooltip: "Solicitud de reconocimiento de reducción de emisiones",
    sortOrder: 3,
  },
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: {
    label: "Reconocimiento de neutralización",
    tooltip: "Solicitud de reconocimiento de neutralización de emisiones",
    sortOrder: 4,
  },
} satisfies Record<SubmissionType, ChipLabel>;

export const SUBMISSION_TYPE_SORT_ORDER = sortOrderByKey(
  SUBMISSION_TYPE_LABELS
);
