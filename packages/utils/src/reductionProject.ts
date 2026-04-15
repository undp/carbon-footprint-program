import {
  ReductionProjectDisplayStatusEnum,
  type ReductionProjectDisplayStatus,
} from "@repo/types";

export function isReductionProjectEditable(
  status: ReductionProjectDisplayStatus
): boolean {
  return (
    status === ReductionProjectDisplayStatusEnum.DRAFT ||
    status === ReductionProjectDisplayStatusEnum.REVIEWED
  );
}

/** First-time submission. */
export function canRequestReductionProjectVerification(
  status: ReductionProjectDisplayStatus
): boolean {
  return status === ReductionProjectDisplayStatusEnum.DRAFT;
}
