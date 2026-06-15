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

/**
 * Whether the project can be submitted to verification — either a first-time
 * submission from DRAFT or a resubmission after the admin returned it as
 * REVIEWED. Mirrors the carbon inventory `canSubmitToVerification`.
 */
export function canSubmitReductionProjectToVerification(
  status: ReductionProjectDisplayStatus
): boolean {
  return (
    status === ReductionProjectDisplayStatusEnum.DRAFT ||
    status === ReductionProjectDisplayStatusEnum.REVIEWED
  );
}

/** Soft-delete is only allowed while the project is still a DRAFT. */
export function isReductionProjectDeletable(
  status: ReductionProjectDisplayStatus
): boolean {
  return status === ReductionProjectDisplayStatusEnum.DRAFT;
}
