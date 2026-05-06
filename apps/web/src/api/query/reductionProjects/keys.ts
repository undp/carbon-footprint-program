export enum ReductionProjectQueryKey {
  Root = "reductionProjects",
  ListDependency = "reductionProjectsListDependency",
  AttributesUpdateDependency = "reductionProjectAttributesUpdateDependency",
  Minimal = "reductionProjectsMinimal",
  Access = "access",
}

export const reductionProjectKeys = {
  all: [
    ReductionProjectQueryKey.Root,
    ReductionProjectQueryKey.ListDependency,
  ] as const,
  detail: (id: string) =>
    [
      ReductionProjectQueryKey.Root,
      id,
      ReductionProjectQueryKey.AttributesUpdateDependency,
    ] as const,
  access: (id: string) =>
    [
      ReductionProjectQueryKey.Root,
      id,
      ReductionProjectQueryKey.Access,
      ReductionProjectQueryKey.AttributesUpdateDependency,
    ] as const,
  minimal: [
    ReductionProjectQueryKey.Root,
    ReductionProjectQueryKey.Minimal,
    ReductionProjectQueryKey.ListDependency,
  ] as const,
};
