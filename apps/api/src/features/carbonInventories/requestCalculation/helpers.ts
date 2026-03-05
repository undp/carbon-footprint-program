import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import {
  calculateDisplayStatus,
  CarbonInventoryWithOrganizationSummaryAndSubmissions,
} from "../helpers.js";

export function canSubmitToCalculation(
  inventory: CarbonInventoryWithOrganizationSummaryAndSubmissions
): boolean {
  const displayStatus = calculateDisplayStatus(inventory);
  return (
    displayStatus === CarbonInventoryDisplayStatusEnum.DRAFT ||
    displayStatus === CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED
  );
}
