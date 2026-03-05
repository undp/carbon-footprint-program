import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import {
  calculateDisplayStatus,
  CarbonInventoryWithOrganizationSummaryAndSubmissions,
} from "../helpers.js";

/**
 * TODO: Validate the carbon inventory does not have an APPROVED or REJECTED
 * submission of type VERIFICATION. This is a placeholder for future implementation.
 */
export function canSubmitToVerification(
  inventory: CarbonInventoryWithOrganizationSummaryAndSubmissions
): boolean {
  const displayStatus = calculateDisplayStatus(inventory);
  return (
    displayStatus === CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED ||
    displayStatus === CarbonInventoryDisplayStatusEnum.VERIFICATION_OBJECTED
  );
}
