import {
  ReductionProjectDisplayStatusEnum,
  type ReductionProjectDisplayStatus,
} from "@repo/types";

export function isReductionProjectDeletable(
  status: ReductionProjectDisplayStatus
): boolean {
  return status === ReductionProjectDisplayStatusEnum.DRAFT;
}

/** First-time or resubmit after rejection. */
export function canRequestReductionProjectVerification(
  status: ReductionProjectDisplayStatus
): boolean {
  return (
    status === ReductionProjectDisplayStatusEnum.DRAFT ||
    status === ReductionProjectDisplayStatusEnum.REJECTED
  );
}
