import {
  CarbonInventoryDisplayStatusEnum as Status,
  GetCarbonInventoriesMinimalResponse,
} from "@repo/types";

type MinimalInventory = GetCarbonInventoriesMinimalResponse[number];

/**
 * A huella "fills" the home dashboard once it is self-declared or its
 * measurement / verification recognition is approved. Everything before that
 * (no huella yet, draft, in review, with observations, rejected) shows the
 * guided welcome home instead — on every login until this becomes true.
 *
 * `isSelfDeclared` is checked as a flag, not only via the SELF_DECLARED display
 * status: a self-declared huella later postulated to a recognition reports the
 * in-review display status, and it must keep filling the dashboard while that
 * review is pending.
 */
export const isDashboardReady = (inventory: MinimalInventory) =>
  inventory.isSelfDeclared ||
  inventory.status === Status.SELF_DECLARED ||
  inventory.status === Status.CALCULATION_APPROVED ||
  inventory.status === Status.VERIFICATION_APPROVED;
