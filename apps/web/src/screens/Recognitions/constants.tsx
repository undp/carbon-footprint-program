import { BadgeType, SubmissionType } from "@repo/types";

export type CarbonInventoryRecognitionsSubmissionType = Exclude<
  SubmissionType,
  "ORGANIZATION_ACCREDITATION"
>;

export type CarbonInventoryRecognitionsBadgeType = Exclude<
  BadgeType,
  "ORGANIZATION_ACCREDITATION"
>;

export const RECOGNITION_SUBMISSION_TYPES: CarbonInventoryRecognitionsSubmissionType[] =
  [
    SubmissionType.CARBON_INVENTORY_CALCULATION,
    SubmissionType.CARBON_INVENTORY_VERIFICATION,
    SubmissionType.REDUCTION_PROJECT_VERIFICATION,
    SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
  ];

export const RECOGNITION_BADGE_TYPES: CarbonInventoryRecognitionsBadgeType[] = [
  BadgeType.CARBON_INVENTORY_CALCULATION,
  BadgeType.CARBON_INVENTORY_VERIFICATION,
  BadgeType.REDUCTION_PROJECT_VERIFICATION,
  BadgeType.NEUTRALIZATION_PLAN_VERIFICATION,
];

export const SUBMISSION_TYPE_TO_BADGE_TYPE: Record<
  CarbonInventoryRecognitionsSubmissionType,
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
  CarbonInventoryRecognitionsSubmissionType,
  string
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "M",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "V",
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: "R",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: "N",
};

export const SUBMISSION_CARD_LABELS: Record<
  CarbonInventoryRecognitionsSubmissionType,
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

export const SUBMISSION_TABLE_LABELS: Record<
  CarbonInventoryRecognitionsSubmissionType,
  string
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "Reconocimiento de Medición",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]:
    "Reconocimiento de Verificación",
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]:
    "Reconocimiento de Reducción",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]:
    "Reconocimiento de Neutralización",
};

export const SUBMISSION_CARD_COLORS: Record<
  CarbonInventoryRecognitionsSubmissionType,
  string
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "#e8f5e9",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "#f5f5f5",
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: "#fff8e1",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: "#e0f7fa",
};
