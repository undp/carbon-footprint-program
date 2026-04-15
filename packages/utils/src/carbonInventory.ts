import {
  CarbonInventoryDisplayStatusEnum,
  type CarbonInventoryDisplayStatus,
} from "@repo/types";

const EDITABLE_STATUSES: CarbonInventoryDisplayStatus[] = [
  CarbonInventoryDisplayStatusEnum.DRAFT,
  CarbonInventoryDisplayStatusEnum.CALCULATION_REVIEWED,
  CarbonInventoryDisplayStatusEnum.SELF_DECLARED,
  CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED,
];

export function isCarbonInventoryEditable(
  status: CarbonInventoryDisplayStatus
): boolean {
  return EDITABLE_STATUSES.includes(status);
}

const DELETABLE_STATUSES: CarbonInventoryDisplayStatus[] = [
  CarbonInventoryDisplayStatusEnum.DRAFT,
];

export function isCarbonInventoryDeletable(
  status: CarbonInventoryDisplayStatus
): boolean {
  return DELETABLE_STATUSES.includes(status);
}

const REQUEST_MEASUREMENT_STATUSES: CarbonInventoryDisplayStatus[] = [
  CarbonInventoryDisplayStatusEnum.DRAFT,
  CarbonInventoryDisplayStatusEnum.SELF_DECLARED,
  CarbonInventoryDisplayStatusEnum.CALCULATION_REVIEWED,
];

export function canSubmitToMeasurement(
  status: CarbonInventoryDisplayStatus
): boolean {
  return REQUEST_MEASUREMENT_STATUSES.includes(status);
}

const REQUEST_VERIFICATION_STATUSES: CarbonInventoryDisplayStatus[] = [
  CarbonInventoryDisplayStatusEnum.SELF_DECLARED,
  CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED,
  CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED,
];

export function canSubmitToVerification(
  status: CarbonInventoryDisplayStatus
): boolean {
  return REQUEST_VERIFICATION_STATUSES.includes(status);
}

const SELF_DECLARABLE_STATUSES: CarbonInventoryDisplayStatus[] = [
  CarbonInventoryDisplayStatusEnum.DRAFT,
];

export function canSelfDeclare(status: CarbonInventoryDisplayStatus): boolean {
  return SELF_DECLARABLE_STATUSES.includes(status);
}
