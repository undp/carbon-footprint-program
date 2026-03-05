import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import {
  calculateDisplayStatus,
  CarbonInventoryWithOrganizationSummaryAndSubmissions,
} from "../helpers.js";

export function canSubmitToVerification(
  inventory: CarbonInventoryWithOrganizationSummaryAndSubmissions
): boolean {
  const displayStatus = calculateDisplayStatus(inventory);
  return (
    displayStatus === CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED ||
    displayStatus === CarbonInventoryDisplayStatusEnum.VERIFICATION_OBJECTED
  );
}
