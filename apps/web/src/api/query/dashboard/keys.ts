import { SubmissionQueryKey } from "../submissions/keys.js";

export const dashboardKeys = {
  common: [
    "admin",
    "dashboard",
    SubmissionQueryKey.SubmissionUpdateDependency,
  ] as const,
  adminKpis: (year?: number) =>
    [...dashboardKeys.common, "kpis", year ?? null] as const,
  adminSectorChart: (limit: number, year?: number) =>
    [...dashboardKeys.common, "sector-chart", limit, year ?? null] as const,
  adminCategoryChart: (year?: number) =>
    [...dashboardKeys.common, "category-chart", year ?? null] as const,
};
