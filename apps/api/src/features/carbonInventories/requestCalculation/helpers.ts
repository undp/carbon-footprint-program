import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import {
  calculateDisplayStatus,
  CarbonInventoryWithOrganizationSummaryAndSubmissions,
} from "../helpers.js";

/**
 * TODO: Validate the carbon inventory does not have an APPROVED or REJECTED
 * submission of type CALCULATION. This is a placeholder for future implementation.
 */
export function canSubmitToCalculation(
  inventory: CarbonInventoryWithOrganizationSummaryAndSubmissions
): boolean {
  const displayStatus = calculateDisplayStatus(inventory);
  return (
    displayStatus === CarbonInventoryDisplayStatusEnum.DRAFT ||
    displayStatus === CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED
  );
}
