import {
  SubmissionType,
  CarbonInventoryRecognitionsType,
  BadgeType,
  RECOGNITION_SUBMISSION_TYPES,
} from "@repo/types";
import {
  SvgIconComponent,
  VerifiedOutlined,
  WorkspacePremiumOutlined,
} from "@mui/icons-material";
import { CarbonInventoryRecognitionsBadgeType } from "@/screens/Recognitions/constants";

export const RECOGNITION_TYPE_LABEL: Record<
  CarbonInventoryRecognitionsType,
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

export const RECOGNITION_TYPE_CHIP_LABEL: Record<
  CarbonInventoryRecognitionsType,
  string
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "Medición",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "Verificación",
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: "Reducción",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: "Neutralización",
};

export const RECOGNITION_ICON: Record<
  CarbonInventoryRecognitionsType,
  SvgIconComponent
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: VerifiedOutlined,
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: WorkspacePremiumOutlined,
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: WorkspacePremiumOutlined,
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: WorkspacePremiumOutlined,
};

export { RECOGNITION_SUBMISSION_TYPES };

export const RECOGNITION_BADGE_TYPES: CarbonInventoryRecognitionsBadgeType[] = [
  BadgeType.CARBON_INVENTORY_CALCULATION,
  BadgeType.CARBON_INVENTORY_VERIFICATION,
  BadgeType.REDUCTION_PROJECT_VERIFICATION,
  BadgeType.NEUTRALIZATION_PLAN_VERIFICATION,
];
