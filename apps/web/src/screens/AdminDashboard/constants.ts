import { SubmissionType, CarbonInventoryRecognitionsType } from "@repo/types";

export const SECTOR_CHART_LIMIT = 5;

export const RECOGNITION_TYPES: CarbonInventoryRecognitionsType[] = [
  SubmissionType.CARBON_INVENTORY_CALCULATION,
  SubmissionType.CARBON_INVENTORY_VERIFICATION,
  SubmissionType.REDUCTION_PROJECT_VERIFICATION,
  SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
];

export const RECOGNITION_TYPES_SET = new Set<string>(RECOGNITION_TYPES);

export const RECOGNITION_TYPE_LABELS: Record<
  CarbonInventoryRecognitionsType,
  string
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "Diploma Medición",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "Diploma Verificación",
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: "Diploma Reducción",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: "Diploma Neutralización",
};
