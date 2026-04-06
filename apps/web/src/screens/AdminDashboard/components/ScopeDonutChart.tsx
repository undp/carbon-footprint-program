import { FC } from "react";
import { Box, Card, Typography } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { AdminDashboardKpisResponse } from "@repo/types";

interface Props {
  data: AdminDashboardKpisResponse["emissionsByScope"];
}

const SCOPE_COLORS = {
  scope1: "#ffb74d",
  scope2: "#64b5f6",
  scope3: "#82c784",
};

export const ScopeDonutChart: FC<Props> = ({ data }) => {
  const pieData = [
    {
      id: 0,
      value: data.scope1Percentage,
      label: `Alcance 1: ${data.scope1Percentage}%`,
      color: SCOPE_COLORS.scope1,
    },
    {
      id: 1,
      value: data.scope2Percentage,
      label: `Alcance 2: ${data.scope2Percentage}%`,
      color: SCOPE_COLORS.scope2,
    },
    {
      id: 2,
      value: data.scope3Percentage,
      label: `Alcance 3: ${data.scope3Percentage}%`,
      color: SCOPE_COLORS.scope3,
    },
  ];

  return (
    <Card sx={{ p: 3, borderRadius: "12px", minWidth: 320 }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Distribución por Alcance
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <PieChart
          series={[
            {
              data: pieData,
              innerRadius: 55,
              outerRadius: 85,
              paddingAngle: 1,
              cornerRadius: 2,
            },
          ]}
          width={320}
          height={250}
        />
      </Box>
    </Card>
  );
};
