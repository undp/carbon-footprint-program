import { useReductionProject } from "@/api/query/reductionProjects";

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
  const { data: project, isLoading, isError } = useReductionProject(projectId);

  // In create mode the caller passes projectId=undefined. useReductionProject
  // is then disabled, but TanStack Query v5 keeps a disabled-with-no-data
  // query at isPending=true forever — so without this guard isReady would
  // never resolve. There's no entity to gate, so the hook is trivially ready.
  const isReady = !projectId ? true : !isLoading;

  return {
    isReady,
    // No projectId = create mode = nothing to access-check.
    canAccess: !projectId || !isError,
    canEdit: !isError && (project?.canEdit ?? false),
  };
};
