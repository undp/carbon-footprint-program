import {
  CarbonInventoryDisplayStatus,
  CarbonInventoryDisplayStatusEnum as Status,
} from "@repo/types";

/**
 * A huella "fills" the home dashboard once it is self-declared or its
 * measurement / verification recognition is approved. Everything before that
 * (no huella yet, draft, in review, with observations, rejected) shows the
 * guided welcome home instead — on every login until this becomes true.
 */
export const isDashboardReady = (status: CarbonInventoryDisplayStatus) =>
  status === Status.SELF_DECLARED ||
  status === Status.CALCULATION_APPROVED ||
  status === Status.VERIFICATION_APPROVED;
