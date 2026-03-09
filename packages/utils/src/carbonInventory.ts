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
