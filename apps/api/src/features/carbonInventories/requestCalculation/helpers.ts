import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import { CarbonInventoryCannotRequestCalculationError } from "../errors.js";
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
): void {
  const displayStatus = calculateDisplayStatus(inventory);
  const can =
    displayStatus === CarbonInventoryDisplayStatusEnum.DRAFT ||
    displayStatus === CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED;

  if (!can)
    throw new CarbonInventoryCannotRequestCalculationError(
      inventory.id.toString()
    );
}
