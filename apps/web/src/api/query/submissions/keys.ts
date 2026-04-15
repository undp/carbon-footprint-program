export enum SubmissionQueryKey {
  Root = "submissions",
  Detail = "detail",
  CarbonInventoryHistory = "carbon-inventory-history",
  OrganizationHistory = "organization-history",
  ReductionProjectHistory = "reduction-project-history",
  // Shared dependency key used to invalidate both carbonInventoryHistory and organizationHistory
  // since request mutations (approve, reject, review) don't know the submission type.
  HistoryUpdateDependency = "history-update-dependency",
}

export const submissionsKeys = {
  all: ["submissions"] as const,
  detail: (id: string) =>
    [SubmissionQueryKey.Root, SubmissionQueryKey.Detail, id] as const,
  carbonInventoryHistory: (carbonInventoryId: string) =>
    [
      SubmissionQueryKey.Root,
      SubmissionQueryKey.CarbonInventoryHistory,
      carbonInventoryId,
      SubmissionQueryKey.HistoryUpdateDependency,
    ] as const,
  organizationHistory: (organizationId: string) =>
    [
      SubmissionQueryKey.Root,
      SubmissionQueryKey.OrganizationHistory,
      organizationId,
      SubmissionQueryKey.HistoryUpdateDependency,
    ] as const,
  reductionProjectHistory: (reductionProjectId: string) =>
    [
      SubmissionQueryKey.Root,
      SubmissionQueryKey.ReductionProjectHistory,
      reductionProjectId,
      SubmissionQueryKey.HistoryUpdateDependency,
    ] as const,
};
