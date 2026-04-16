export const dashboardKeys = {
  adminDashboard: ["admin", "dashboard"] as const,
  adminKpis: (year?: number) =>
    [...dashboardKeys.adminDashboard, "kpis", year ?? null] as const,
  adminSectorChart: (limit: number, year?: number) =>
    [
      ...dashboardKeys.adminDashboard,
      "sector-chart",
      limit,
      year ?? null,
    ] as const,
  adminCategoryChart: (year?: number) =>
    [
      ...dashboardKeys.adminDashboard,
      "category-chart",
      year ?? null,
    ] as const,
};
