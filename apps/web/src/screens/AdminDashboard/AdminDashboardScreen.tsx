import { FC } from "react";
import { Box } from "@mui/material";
import { Route } from "@/routes/admin/dashboard";
import { AdminDashboardHeader } from "./components/AdminDashboardHeader";
import { KpiSummarySection } from "./components/KpiSummarySection";
import { AdminDashboardCharts } from "./components/AdminDashboardCharts";
import { RequestsSummaryCard } from "./components/RequestsSummaryCard";
import { RecognitionsSummaryCard } from "./components/RecognitionsSummaryCard";

export const AdminDashboardScreen: FC = () => {
  const { year: routeYear } = Route.useSearch();

  return (
    <Box className="flex flex-col gap-6">
      <AdminDashboardHeader year={routeYear} />
      <KpiSummarySection year={routeYear} />
      <AdminDashboardCharts year={routeYear} />
      <RequestsSummaryCard year={routeYear} />
      <RecognitionsSummaryCard year={routeYear} />
    </Box>
  );
};
