import type { QueryClient } from "@tanstack/react-query";

export const reductionProjectKeys = {
  all: ["reductionProjects"] as const,
  detail: (id: string) => ["reductionProjects", id] as const,
  sealApplications: ["reductionProjects", "sealApplications"] as const,
};

export const invalidateReductionProjects = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    queryKey: reductionProjectKeys.all,
  });

export const invalidateReductionProjectDetail = (
  queryClient: QueryClient,
  id: string
) =>
  queryClient.invalidateQueries({
    queryKey: reductionProjectKeys.detail(id),
    exact: true,
  });

export const invalidateSealApplications = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    queryKey: reductionProjectKeys.sealApplications,
    exact: true,
  });
