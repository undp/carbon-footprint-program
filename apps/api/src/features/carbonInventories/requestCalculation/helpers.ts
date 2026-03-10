import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import {
  calculateDisplayStatus,
  CarbonInventoryWithSubmissionsMinimal,
} from "../helpers.js";

export function canSubmitToCalculation(
  inventory: CarbonInventoryWithSubmissionsMinimal
): boolean {
  const displayStatus = calculateDisplayStatus(inventory);
  return (
    displayStatus === CarbonInventoryDisplayStatusEnum.DRAFT ||
    displayStatus === CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED
  );
}
