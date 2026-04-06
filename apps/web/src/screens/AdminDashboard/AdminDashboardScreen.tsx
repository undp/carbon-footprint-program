import { FC, useState } from "react";
import { Box, Skeleton, Stack } from "@mui/material";
import { useDashboardKpis } from "@/api/query/adminDashboard/useDashboardKpis";
import {
  DashboardHeader,
  KpiCardsRow,
  SectorBarChart,
  ScopeDonutChart,
  SubmissionSummary,
} from "./components";

const CURRENT_YEAR = new Date().getFullYear();

const DashboardSkeleton: FC = () => (
  <Stack spacing={3}>
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Skeleton variant="text" width={250} height={40} />
      <Skeleton variant="rounded" width={120} height={40} />
    </Box>
    <Stack direction="row" spacing={3}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" width={300} height={163} />
      ))}
    </Stack>
    <Stack direction="row" spacing={3}>
      <Skeleton variant="rounded" height={300} sx={{ flex: 1 }} />
      <Skeleton variant="rounded" width={320} height={300} />
    </Stack>
    <Stack direction="row" spacing={3}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={100} sx={{ flex: 1 }} />
      ))}
    </Stack>
  </Stack>
);

export const AdminDashboardScreen: FC = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const { data, isLoading } = useDashboardKpis(year);

  if (isLoading || !data) {
    return (
      <Box>
        <DashboardSkeleton />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <DashboardHeader year={year} onYearChange={setYear} />
      <KpiCardsRow data={data} />
      <Stack direction="row" spacing={3}>
        <SectorBarChart data={data.organizationsBySector} />
        <ScopeDonutChart data={data.emissionsByScope} />
      </Stack>
      <SubmissionSummary data={data.submissionSummary} />
    </Stack>
  );
};
