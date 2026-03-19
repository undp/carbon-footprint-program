import {
  CarbonInventoryDisplayStatusEnum,
  type CarbonInventoryDisplayStatus,
} from "@repo/types";

const EDITABLE_STATUSES: CarbonInventoryDisplayStatus[] = [
  CarbonInventoryDisplayStatusEnum.DRAFT,
  CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED,
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

const REQUEST_VERIFICATION_STATUSES: CarbonInventoryDisplayStatus[] = [
  CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED,
  CarbonInventoryDisplayStatusEnum.VERIFICATION_OBJECTED,
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
