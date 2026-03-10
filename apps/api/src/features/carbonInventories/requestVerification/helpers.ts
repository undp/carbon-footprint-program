import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import {
  calculateDisplayStatus,
  CarbonInventoryWithSubmissionsMinimal,
} from "../helpers.js";

export function canSubmitToVerification(
  inventory: CarbonInventoryWithSubmissionsMinimal
): boolean {
  const displayStatus = calculateDisplayStatus(inventory);
  return (
    displayStatus === CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED ||
    displayStatus === CarbonInventoryDisplayStatusEnum.VERIFICATION_OBJECTED
  );
}
