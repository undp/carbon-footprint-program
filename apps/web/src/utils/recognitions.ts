import {
  CarbonInventoryRecognitionsType,
  BadgeType,
  RECOGNITION_SUBMISSION_TYPES as ALL_RECOGNITION_SUBMISSION_TYPES,
  SubmissionType,
} from "@repo/types";
import { SvgIconComponent } from "@mui/icons-material";
import { mapValues } from "lodash-es";
import { CarbonInventoryRecognitionsBadgeType } from "@/screens/Recognitions/constants";
import { RECOGNITION_TYPE_LABELS } from "@/labels/chips/recognitionType";

export const RECOGNITION_TYPE_LABEL: Record<
  CarbonInventoryRecognitionsType,
  string
> = mapValues(RECOGNITION_TYPE_LABELS, (entry) => entry.fullLabel);

export const RECOGNITION_TYPE_CHIP_LABEL: Record<
  CarbonInventoryRecognitionsType,
  string
> = mapValues(RECOGNITION_TYPE_LABELS, (entry) => entry.chipLabel);

export const RECOGNITION_ICON: Record<
  CarbonInventoryRecognitionsType,
  SvgIconComponent
> = mapValues(RECOGNITION_TYPE_LABELS, (entry) => entry.icon);

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
