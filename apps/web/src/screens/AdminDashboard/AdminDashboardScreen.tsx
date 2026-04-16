import { FC, useCallback } from "react";
import { Box } from "@mui/material";
import { Route } from "@/routes/admin/dashboard";
import { useNavigate } from "@tanstack/react-router";
import { AdminDashboardHeader } from "./components/AdminDashboardHeader";
import { KpiSummarySection } from "./components/KpiSummarySection";
import { AdminDashboardCharts } from "./components/AdminDashboardCharts";
import { RequestsSummaryCard } from "./components/RequestsSummaryCard";
import { RecognitionsSummaryCard } from "./components/RecognitionsSummaryCard";

export const AdminDashboardScreen: FC = () => {
  const { year: routeYear } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/dashboard" });

  const handleYearChange = useCallback(
    (year?: number) => {
      void navigate({
        search: year !== undefined ? { year } : {},
        replace: true,
      });
    },
    [navigate]
  );

  return (
    <Box className="flex flex-col gap-6">
      <AdminDashboardHeader year={routeYear} onYearChange={handleYearChange} />
      <KpiSummarySection year={routeYear} />
      <AdminDashboardCharts year={routeYear} />
      <RequestsSummaryCard year={routeYear} />
      <RecognitionsSummaryCard year={routeYear} />
    </Box>
  );
};
