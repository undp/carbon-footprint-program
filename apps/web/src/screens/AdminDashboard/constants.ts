import { SubmissionType } from "@repo/types";

export const SECTOR_CHART_LIMIT = 5;

export const formatNumber = (value: number): string =>
  value.toLocaleString("es", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const RECOGNITION_TYPES = [
  SubmissionType.CARBON_INVENTORY_CALCULATION,
  SubmissionType.CARBON_INVENTORY_VERIFICATION,
  SubmissionType.REDUCTION_PROJECT_VERIFICATION,
  SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
] as const;

export const RECOGNITION_TYPES_SET = new Set<string>(RECOGNITION_TYPES);

export const RECOGNITION_TYPE_LABELS: Record<
  (typeof RECOGNITION_TYPES)[number],
  string
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "Diploma Medición",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "Diploma Verificación",
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: "Diploma Reducción",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: "Diploma Neutralización",
};
