import {
  Co2Outlined,
  EmojiEventsOutlined,
  PublicOutlined,
  VerifiedOutlined,
} from "@mui/icons-material";
import { BadgeType, SubmissionType } from "@repo/types";

export type AwardSubmissionType = Exclude<
  SubmissionType,
  "ORGANIZATION_ACCREDITATION"
>;

export type AwardBadgeType = Exclude<BadgeType, "ORGANIZATION_ACCREDITATION">;

export const AWARD_SUBMISSION_TYPES: AwardSubmissionType[] = [
  SubmissionType.CARBON_INVENTORY_CALCULATION,
  SubmissionType.CARBON_INVENTORY_VERIFICATION,
  SubmissionType.REDUCTION_PLAN_VERIFICATION,
  SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
];

export const AWARD_BADGE_TYPES: AwardBadgeType[] = [
  BadgeType.CARBON_INVENTORY_CALCULATION,
  BadgeType.CARBON_INVENTORY_VERIFICATION,
  BadgeType.REDUCTION_PLAN_VERIFICATION,
  BadgeType.NEUTRALIZATION_PLAN_VERIFICATION,
];

export const SUBMISSION_TYPE_TO_BADGE_TYPE: Record<
  AwardSubmissionType,
  AwardBadgeType
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]:
    BadgeType.CARBON_INVENTORY_CALCULATION,
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]:
    BadgeType.CARBON_INVENTORY_VERIFICATION,
  [SubmissionType.REDUCTION_PLAN_VERIFICATION]:
    BadgeType.REDUCTION_PLAN_VERIFICATION,
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]:
    BadgeType.NEUTRALIZATION_PLAN_VERIFICATION,
};

export const SUBMISSION_LABELS: Record<AwardSubmissionType, string> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "Diploma Medición",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "Sello Verificación",
  [SubmissionType.REDUCTION_PLAN_VERIFICATION]: "Sello Reducción",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: "Sello Neutralización",
};

export const SUBMISSION_CARD_COLORS: Record<AwardSubmissionType, string> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "#e8f5e9",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "#f5f5f5",
  [SubmissionType.REDUCTION_PLAN_VERIFICATION]: "#fff8e1",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: "#e0f7fa",
};

export const SUBMISSION_ACTION_ICON: Record<
  AwardSubmissionType,
  React.ReactElement
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: (
    <EmojiEventsOutlined fontSize="small" />
  ),
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: (
    <VerifiedOutlined fontSize="small" />
  ),
  [SubmissionType.REDUCTION_PLAN_VERIFICATION]: (
    <Co2Outlined fontSize="small" />
  ),
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: (
    <PublicOutlined fontSize="small" />
  ),
};
