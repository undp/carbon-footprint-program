export const adminDashboardKeys = {
  all: ["adminDashboard"] as const,
  kpis: (year?: number) =>
    [...adminDashboardKeys.all, "kpis", year] as const,
};
