import { FC, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { useSnackbar } from "notistack";
import { useAdminDashboardSectorChart } from "@/api/query/dashboard";
import { SECTOR_CHART_LIMIT } from "../constants";

type SectorTab = "companies" | "emissions";

interface SectorChartCardProps {
  year?: number;
}

export const SectorChartCard: FC<SectorChartCardProps> = ({ year }) => {
  const [activeTab, setActiveTab] = useState<SectorTab>("companies");
  const { data, isLoading, isError } = useAdminDashboardSectorChart(
    SECTOR_CHART_LIMIT,
    year
  );
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (isError) {
      enqueueSnackbar("Error al cargar el gráfico de sectores", {
        variant: "error",
      });
    }
  }, [isError, enqueueSnackbar]);

  const title =
    activeTab === "companies" ? "Empresas por Rubro" : "Emisiones por Rubro";

  const chartData = useMemo(() => {
    if (!data) return [];
    if (activeTab === "companies") {
      return (data.sectorRanking ?? []).map((s) => ({
        label: s.sectorName ?? "Desconocido",
        value: s.organizationCount,
      }));
    }
    return (data.sectorEmissions ?? []).map((s) => ({
      label: s.sectorName ?? "Desconocido",
      value: s.totalEmissions,
    }));
  }, [data, activeTab]);

  const yAxisLabel =
    activeTab === "companies" ? "Empresas" : "Emisiones (tCO₂e)";

  return (
    <Card
      sx={{
        borderRadius: "12px",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        height: "100%",
      }}
    >
      <CardContent>
        <Box className="mb-4 flex items-center justify-between">
          <Typography variant="h6" fontWeight={700}>
            {title}
          </Typography>
          <Tabs
            value={activeTab}
            onChange={(_, val: SectorTab) => setActiveTab(val)}
            sx={{ minHeight: "unset" }}
          >
            <Tab
              label="Empresas"
              value="companies"
              sx={{ minHeight: "unset", py: 0.5, px: 1, fontSize: "0.75rem" }}
            />
            <Tab
              label="Emisiones"
              value="emissions"
              sx={{ minHeight: "unset", py: 0.5, px: 1, fontSize: "0.75rem" }}
            />
          </Tabs>
        </Box>

        {isLoading && (
          <Box
            sx={{
              height: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Skeleton variant="rectangular" width="100%" height={180} />
          </Box>
        )}

        {!isLoading && isError && (
          <Box
            sx={{
              height: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" color="error.main">
              Error al cargar los datos
            </Typography>
          </Box>
        )}

        {!isLoading && !isError && chartData.length === 0 && (
          <Box
            sx={{
              height: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Sin datos disponibles
            </Typography>
          </Box>
        )}

        {!isLoading && !isError && chartData.length > 0 && (
          <BarChart
            xAxis={[
              {
                scaleType: "band",
                data: chartData.map((d) => d.label),
                label: "Rubro",
              },
            ]}
            yAxis={[{ label: yAxisLabel }]}
            series={[{ data: chartData.map((d) => d.value) }]}
            height={220}
            margin={{ top: 10, bottom: 50, left: 60, right: 10 }}
          />
        )}
      </CardContent>
    </Card>
  );
};
