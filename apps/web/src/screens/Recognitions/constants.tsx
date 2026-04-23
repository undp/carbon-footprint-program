import {
  BadgeType,
  CarbonInventoryRecognitionsType,
  SubmissionType,
} from "@repo/types";

export type CarbonInventoryRecognitionsBadgeType = Exclude<
  BadgeType,
  "ORGANIZATION_ACCREDITATION"
>;

export const SUBMISSION_TYPE_TO_BADGE_TYPE: Record<
  CarbonInventoryRecognitionsType,
  CarbonInventoryRecognitionsBadgeType
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]:
    BadgeType.CARBON_INVENTORY_CALCULATION,
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]:
    BadgeType.CARBON_INVENTORY_VERIFICATION,
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]:
    BadgeType.REDUCTION_PROJECT_VERIFICATION,
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]:
    BadgeType.NEUTRALIZATION_PLAN_VERIFICATION,
};

export const SUBMISSION_LETTER: Record<
  CarbonInventoryRecognitionsType,
  string
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "M",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "V",
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: "R",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: "N",
};

export const SUBMISSION_CARD_LABELS: Record<
  CarbonInventoryRecognitionsType,
  string
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "Reconocimientos de Medición",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]:
    "Reconocimientos de Verificación",
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]:
    "Reconocimientos de Reducción",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]:
    "Reconocimientos de Neutralización",
};
