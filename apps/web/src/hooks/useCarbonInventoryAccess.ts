import { useCarbonInventoryAccessQuery } from "@/api/query";

export interface CarbonInventoryAccess {
  /** True once the underlying read settles; consumers gate redirects on this. */
  isReady: boolean;
  /** False when the read failed (e.g. 403). Caller should bail out of the feature. */
  canAccess: boolean;
  /** False either because the read failed or because the server says edit is not allowed. */
  canEdit: boolean;
}

export const useCarbonInventoryAccess = (
  inventoryId: string
): CarbonInventoryAccess => {
  const { data, isLoading, isError } =
    useCarbonInventoryAccessQuery(inventoryId);

  return {
    isReady: !isLoading,
    canAccess: !isError,
    canEdit: !isError && (data?.canEdit ?? false),
  };
};
