import { FC } from "react";
import { Grid } from "@mui/material";
import { SectorChartCard } from "./SectorChartCard";
import { CategoryChartCard } from "./CategoryChartCard";

interface AdminDashboardChartsProps {
  year?: number;
}

export const AdminDashboardCharts: FC<AdminDashboardChartsProps> = ({
  year,
}) => (
  <Grid container spacing={2}>
    <Grid size={{ xs: 12, md: 6 }}>
      <SectorChartCard year={year} />
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      <CategoryChartCard key={year ?? "all"} year={year} />
    </Grid>
  </Grid>
);
