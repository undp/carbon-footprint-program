import { FC, useState } from "react";
import {
  Box,
  Card,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { AdminDashboardKpisResponse } from "@repo/types";

type ViewMode = "companies" | "emissions";

interface Props {
  data: AdminDashboardKpisResponse["organizationsBySector"];
}

export const SectorBarChart: FC<Props> = ({ data }) => {
  const [viewMode, setViewMode] = useState<ViewMode>("companies");

  const sorted = [...data].sort((a, b) => {
    const key = viewMode === "companies" ? "count" : "emissions";
    return b[key] - a[key];
  });

  const labels = sorted.map((d) => d.sectorName);
  const values = sorted.map((d) =>
    viewMode === "companies" ? d.count : d.emissions
  );

  return (
    <Card sx={{ p: 3, borderRadius: "12px", flex: 1 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Empresas por Rubro
        </Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v: ViewMode | null) => {
            if (v !== null) setViewMode(v);
          }}
          size="small"
        >
          <ToggleButton value="companies">Empresas</ToggleButton>
          <ToggleButton value="emissions">Emisiones tCO₂e</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {sorted.length > 0 ? (
        <BarChart
          yAxis={[{ scaleType: "band", data: labels }]}
          series={[{ data: values }]}
          layout="horizontal"
          height={Math.max(250, sorted.length * 40)}
          margin={{ left: 150 }}
          grid={{ vertical: true }}
        />
      ) : (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ py: 4, textAlign: "center" }}
        >
          No hay datos disponibles
        </Typography>
      )}
    </Card>
  );
};
