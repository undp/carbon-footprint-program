import {
  CarbonInventoryRecognitionsType,
  BadgeType,
  RECOGNITION_SUBMISSION_TYPES as ALL_RECOGNITION_SUBMISSION_TYPES,
} from "@repo/types";
import { SvgIconComponent } from "@mui/icons-material";
import { CarbonInventoryRecognitionsBadgeType } from "@/screens/Recognitions/constants";
import { RECOGNITION_TYPE_LABELS } from "@/labels/status/recognitionType";

export const RECOGNITION_TYPE_LABEL: Record<
  CarbonInventoryRecognitionsType,
  string
> = Object.fromEntries(
  Object.entries(RECOGNITION_TYPE_LABELS).map(([type, entry]) => [
    type,
    entry.fullLabel,
  ])
) as Record<CarbonInventoryRecognitionsType, string>;

export const RECOGNITION_TYPE_CHIP_LABEL: Record<
  CarbonInventoryRecognitionsType,
  string
> = Object.fromEntries(
  Object.entries(RECOGNITION_TYPE_LABELS).map(([type, entry]) => [
    type,
    entry.chipLabel,
  ])
) as Record<CarbonInventoryRecognitionsType, string>;

export const RECOGNITION_ICON: Record<
  CarbonInventoryRecognitionsType,
  SvgIconComponent
> = Object.fromEntries(
  Object.entries(RECOGNITION_TYPE_LABELS).map(([type, entry]) => [
    type,
    entry.icon,
  ])
) as Record<CarbonInventoryRecognitionsType, SvgIconComponent>;

// Neutralization recognitions are hidden in the front until the admin
// neutralization module is implemented.
// TODO: Re-export RECOGNITION_SUBMISSION_TYPES directly (drop this filter) once the
// admin neutralization module is implemented.
export const RECOGNITION_SUBMISSION_TYPES: CarbonInventoryRecognitionsType[] =
  ALL_RECOGNITION_SUBMISSION_TYPES.filter(
    (type) => type !== SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION
  );

export const RECOGNITION_BADGE_TYPES: CarbonInventoryRecognitionsBadgeType[] = [
  BadgeType.CARBON_INVENTORY_CALCULATION,
  BadgeType.CARBON_INVENTORY_VERIFICATION,
  BadgeType.REDUCTION_PROJECT_VERIFICATION,
  // TODO: Re-enable BadgeType.NEUTRALIZATION_PLAN_VERIFICATION here once the admin
  // neutralization module is implemented.
];
