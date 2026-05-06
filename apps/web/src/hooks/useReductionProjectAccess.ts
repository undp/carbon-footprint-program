import { useReductionProjectAccessQuery } from "@/api/query/reductionProjects";

export interface ReductionProjectAccess {
  /** True once the underlying read settles; consumers gate redirects on this. */
  isReady: boolean;
  /** False when the read failed (e.g. 403). Caller should bail out of the feature. */
  canAccess: boolean;
  /** False either because the read failed or because the server says edit is not allowed. */
  canEdit: boolean;
}

export const useReductionProjectAccess = (
  projectId: string | undefined
): ReductionProjectAccess => {
  const { data, isLoading, isError } =
    useReductionProjectAccessQuery(projectId);

  // No projectId = create mode = nothing to access-check.
  const isReady = !projectId || !isLoading;

  return {
    isReady,
    canAccess: !projectId || !isError,
    canEdit: !isError && (data?.canEdit ?? false),
  };
};
