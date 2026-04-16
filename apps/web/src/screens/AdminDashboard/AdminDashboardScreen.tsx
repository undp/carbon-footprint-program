import { FC, useEffect } from "react";
import { Box, Card, Grid, Stack, Typography, useTheme } from "@mui/material";
import {
  BusinessOutlined,
  Co2Outlined,
  EmojiEventsOutlined,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useAdminDashboardKpis } from "@/api/query/dashboard";
import { Route } from "@/routes/admin/dashboard";
import { useNavigate } from "@tanstack/react-router";
import { YearSelector } from "./components/YearSelector";
import { KpiSummaryCard } from "./components/KpiSummaryCard";
import { SectorChartCard } from "./components/SectorChartCard";
import { CategoryChartCard } from "./components/CategoryChartCard";
import { RequestsSummaryCard } from "./components/RequestsSummaryCard";
import { RecognitionTypeCards } from "./components/RecognitionTypeCards";

export const AdminDashboardScreen: FC = () => {
  const { year: routeYear } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/dashboard" });
  const theme = useTheme();

  const handleYearChange = (year?: number) => {
    void navigate({
      search: year !== undefined ? { year } : {},
      replace: true,
    });
  };

  const {
    data: kpisData,
    isLoading: kpisLoading,
    isError: kpisError,
  } = useAdminDashboardKpis(routeYear);

  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (kpisError) {
      enqueueSnackbar("Error al cargar los KPIs del dashboard", {
        variant: "error",
      });
    }
  }, [kpisError, enqueueSnackbar]);

  return (
    <Box className="flex flex-col gap-6">
      {/* Header */}
      <Card
        sx={{
          p: 2,
          borderRadius: "16px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Dashboard General
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Resumen general de la plataforma
            </Typography>
          </Box>
          <YearSelector year={routeYear} onYearChange={handleYearChange} />
        </Stack>
      </Card>

      {/* KPI Summary Cards */}
      <Stack direction="row" spacing={2}>
        <KpiSummaryCard
          title="Empresas inscritas"
          color={theme.palette.primary.main}
          Icon={BusinessOutlined}
          primaryValue={kpisData?.totalOrganizations ?? 0}
          primaryLabel="Inscritas"
          secondaryValue={kpisData?.measuringOrganizations ?? 0}
          secondaryLabel="Midiendo"
          isLoading={kpisLoading}
          hasError={kpisError}
        />
        <KpiSummaryCard
          title="Emisiones"
          color={theme.palette.warning.main}
          Icon={Co2Outlined}
          primaryValue={kpisData?.totalEmissions ?? 0}
          primaryLabel="Total (tCO₂e)"
          secondaryValue={kpisData?.verifiedEmissions ?? 0}
          secondaryLabel="Verificadas (tCO₂e)"
          isLoading={kpisLoading}
          hasError={kpisError}
        />
        <KpiSummaryCard
          title="Reconocimientos"
          color={theme.palette.success.main}
          Icon={EmojiEventsOutlined}
          primaryValue={kpisData?.recognitionsEarned ?? 0}
          primaryLabel="Otorgados"
          secondaryValue={kpisData?.recognitionsUnderReview ?? 0}
          secondaryLabel="En revisión"
          isLoading={kpisLoading}
          hasError={kpisError}
        />
      </Stack>

      {/* Charts */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectorChartCard year={routeYear} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <CategoryChartCard key={routeYear ?? "all"} year={routeYear} />
        </Grid>
      </Grid>

      {/* Submission Summary */}
      <RequestsSummaryCard year={routeYear} />

      {/* Recognition Type Cards */}
      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Reconocimientos Otorgados
        </Typography>
        <RecognitionTypeCards year={routeYear} />
      </Box>
    </Box>
  );
};
