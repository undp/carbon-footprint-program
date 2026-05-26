// Canonical enum definitions for @repo/database.
//
// SQL Server does not support native Prisma `enum` blocks (PostgreSQL does), so
// the SQL Server schema declares these as `String` columns guarded by CHECK
// constraints and therefore generates NO enum objects. To keep enum imports
// identical across providers, this hand-authored module is the single source of
// truth for the 31 enums and is re-exported by both `@repo/database/enums` and
// `@repo/database` (see src/index.ts). The values mirror the PostgreSQL schema's
// native enums exactly; keep this file in sync whenever an enum changes in
// either schema (a documented manual parity point — see the multi-db ADR).

export const CountryOrganizationSizeStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type CountryOrganizationSizeStatus =
  (typeof CountryOrganizationSizeStatus)[keyof typeof CountryOrganizationSizeStatus];

export const CountrySectorStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type CountrySectorStatus =
  (typeof CountrySectorStatus)[keyof typeof CountrySectorStatus];

export const CountrySubsectorStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type CountrySubsectorStatus =
  (typeof CountrySubsectorStatus)[keyof typeof CountrySubsectorStatus];

export const OrganizationMainActivityStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type OrganizationMainActivityStatus =
  (typeof OrganizationMainActivityStatus)[keyof typeof OrganizationMainActivityStatus];

export const SystemRole = {
  USER: "USER",
  ADMIN: "ADMIN",
  SUPERADMIN: "SUPERADMIN",
} as const;
export type SystemRole = (typeof SystemRole)[keyof typeof SystemRole];

export const OrganizationRole = {
  VIEWER: "VIEWER",
  CONTRIBUTOR: "CONTRIBUTOR",
  ADMIN: "ADMIN",
} as const;
export type OrganizationRole =
  (typeof OrganizationRole)[keyof typeof OrganizationRole];

export const MembershipStatus = {
  ACTIVE: "ACTIVE",
  OUTDATED: "OUTDATED",
  DELETED: "DELETED",
} as const;
export type MembershipStatus =
  (typeof MembershipStatus)[keyof typeof MembershipStatus];

export const SubcategoryStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type SubcategoryStatus =
  (typeof SubcategoryStatus)[keyof typeof SubcategoryStatus];

export const EmissionFactorDimensionStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type EmissionFactorDimensionStatus =
  (typeof EmissionFactorDimensionStatus)[keyof typeof EmissionFactorDimensionStatus];

export const EmissionFactorDimensionValueStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type EmissionFactorDimensionValueStatus =
  (typeof EmissionFactorDimensionValueStatus)[keyof typeof EmissionFactorDimensionValueStatus];

export const MagnitudeStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type MagnitudeStatus =
  (typeof MagnitudeStatus)[keyof typeof MagnitudeStatus];

export const MeasurementUnitStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type MeasurementUnitStatus =
  (typeof MeasurementUnitStatus)[keyof typeof MeasurementUnitStatus];

export const MethodologyVersionStatus = {
  PUBLISHED: "PUBLISHED",
  UNPUBLISHED: "UNPUBLISHED",
  DELETED: "DELETED",
} as const;
export type MethodologyVersionStatus =
  (typeof MethodologyVersionStatus)[keyof typeof MethodologyVersionStatus];

export const CategoryStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type CategoryStatus =
  (typeof CategoryStatus)[keyof typeof CategoryStatus];

export const SubcategoryRecommendationStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type SubcategoryRecommendationStatus =
  (typeof SubcategoryRecommendationStatus)[keyof typeof SubcategoryRecommendationStatus];

export const EmissionFactorStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type EmissionFactorStatus =
  (typeof EmissionFactorStatus)[keyof typeof EmissionFactorStatus];

export const InventoryStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type InventoryStatus =
  (typeof InventoryStatus)[keyof typeof InventoryStatus];

export const UsageMode = {
  SIMPLIFIED: "SIMPLIFIED",
  EXPERT: "EXPERT",
} as const;
export type UsageMode = (typeof UsageMode)[keyof typeof UsageMode];

export const CarbonInventoryLineStatus = {
  ACTIVE: "ACTIVE",
  OUTDATED: "OUTDATED",
  DELETED: "DELETED",
} as const;
export type CarbonInventoryLineStatus =
  (typeof CarbonInventoryLineStatus)[keyof typeof CarbonInventoryLineStatus];

export const InputType = {
  SIMPLIFIED: "SIMPLIFIED",
  EXPERT: "EXPERT",
  DIRECT: "DIRECT",
} as const;
export type InputType = (typeof InputType)[keyof typeof InputType];

export const OrganizationSummaryDisplayStatus = {
  NOT_ACCREDITED: "NOT_ACCREDITED",
  ACCREDITED: "ACCREDITED",
  BLOCKED: "BLOCKED",
} as const;
export type OrganizationSummaryDisplayStatus =
  (typeof OrganizationSummaryDisplayStatus)[keyof typeof OrganizationSummaryDisplayStatus];

export const OrganizationStatus = {
  ACTIVE: "ACTIVE",
  BLOCKED: "BLOCKED",
} as const;
export type OrganizationStatus =
  (typeof OrganizationStatus)[keyof typeof OrganizationStatus];

export const OrganizationDataStatus = {
  OUTDATED: "OUTDATED",
  ACTIVE: "ACTIVE",
} as const;
export type OrganizationDataStatus =
  (typeof OrganizationDataStatus)[keyof typeof OrganizationDataStatus];

export const SubmissionFileType = {
  SUBMIT_ATTACHMENT: "SUBMIT_ATTACHMENT",
  RECOGNITION: "RECOGNITION",
  REVIEW_ATTACHMENT: "REVIEW_ATTACHMENT",
} as const;
export type SubmissionFileType =
  (typeof SubmissionFileType)[keyof typeof SubmissionFileType];

export const FileStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type FileStatus = (typeof FileStatus)[keyof typeof FileStatus];

export const ReductionProjectStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type ReductionProjectStatus =
  (typeof ReductionProjectStatus)[keyof typeof ReductionProjectStatus];

export const SubmissionStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  APPROVED_AUTOMATICALLY: "APPROVED_AUTOMATICALLY",
  REVIEWED: "REVIEWED",
  REJECTED: "REJECTED",
} as const;
export type SubmissionStatus =
  (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

export const SubmissionType = {
  ORGANIZATION_ACCREDITATION: "ORGANIZATION_ACCREDITATION",
  CARBON_INVENTORY_CALCULATION: "CARBON_INVENTORY_CALCULATION",
  CARBON_INVENTORY_VERIFICATION: "CARBON_INVENTORY_VERIFICATION",
  REDUCTION_PROJECT_VERIFICATION: "REDUCTION_PROJECT_VERIFICATION",
  NEUTRALIZATION_PLAN_VERIFICATION: "NEUTRALIZATION_PLAN_VERIFICATION",
} as const;
export type SubmissionType =
  (typeof SubmissionType)[keyof typeof SubmissionType];

export const BadgeType = {
  ORGANIZATION_ACCREDITATION: "ORGANIZATION_ACCREDITATION",
  CARBON_INVENTORY_CALCULATION: "CARBON_INVENTORY_CALCULATION",
  CARBON_INVENTORY_VERIFICATION: "CARBON_INVENTORY_VERIFICATION",
  REDUCTION_PROJECT_VERIFICATION: "REDUCTION_PROJECT_VERIFICATION",
  NEUTRALIZATION_PLAN_VERIFICATION: "NEUTRALIZATION_PLAN_VERIFICATION",
} as const;
export type BadgeType = (typeof BadgeType)[keyof typeof BadgeType];

export const BadgeStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type BadgeStatus = (typeof BadgeStatus)[keyof typeof BadgeStatus];

export const ReductionPlanInitiativeStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type ReductionPlanInitiativeStatus =
  (typeof ReductionPlanInitiativeStatus)[keyof typeof ReductionPlanInitiativeStatus];
