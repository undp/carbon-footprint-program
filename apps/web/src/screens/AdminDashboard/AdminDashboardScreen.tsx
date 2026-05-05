import { FC } from "react";
import { Box } from "@mui/material";
import { Route } from "@/routes/admin/dashboard";
import { AdminDashboardHeader } from "./components/AdminDashboardHeader";
import { KpiSummarySection } from "./components/KpiSummarySection";
import { AdminDashboardCharts } from "./components/AdminDashboardCharts";
import { SubmissionsSummaryCard } from "./components/SubmissionsSummaryCard";
import { RecognitionsSummaryCard } from "./components/RecognitionsSummaryCard";

const ADMIN_DASHBOARD_EXPLANATION_SLUGS = {
  MAIN: "admin-dashboard",
} as const;

export const AdminDashboardScreen: FC = () => {
  const { year: routeYear } = Route.useSearch();

  return (
    <Box className="flex flex-col gap-6">
      <AdminDashboardHeader
        year={routeYear}
        explanationSlug={ADMIN_DASHBOARD_EXPLANATION_SLUGS.MAIN}
      />
      <KpiSummarySection year={routeYear} />
      <AdminDashboardCharts year={routeYear} />
      <SubmissionsSummaryCard year={routeYear} />
      <RecognitionsSummaryCard year={routeYear} />
    </Box>
  );
};
