import { FC, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import {
  BusinessOutlined,
  Co2Outlined,
  EmojiEventsOutlined,
  AccessTimeOutlined,
  CheckCircleOutlined,
  DisabledVisibleOutlined,
} from "@mui/icons-material";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { useSnackbar } from "notistack";
import { SubmissionType, SubmissionStatus } from "@repo/types";
import {
  useAdminDashboardKpis,
  useAdminDashboardSectorChart,
  useAdminDashboardCategoryChart,
} from "@/api/query/dashboard";
import { useAdminRequestsKpis } from "@/api/query/requests/useAdminRequestsKpis";
import { DASHBOARD_YEARS_RANGE_FROM_CURRENT } from "@/config/constants";
import { Route } from "@/routes/admin/dashboard";
import { useNavigate } from "@tanstack/react-router";

const SECTOR_CHART_LIMIT = 5;

const formatNumber = (value: number): string =>
  value.toLocaleString("es", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

// ─── Year Selector ────────────────────────────────────────────────────────────

interface YearSelectorProps {
  year?: number;
  onYearChange: (year?: number) => void;
}

const YearSelector: FC<YearSelectorProps> = ({ year, onYearChange }) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: DASHBOARD_YEARS_RANGE_FROM_CURRENT },
    (_, i) => currentYear - i
  );

  return (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <Select
        value={year ?? "all"}
        onChange={(e) => {
          const val = e.target.value;
          onYearChange(val === "all" ? undefined : Number(val));
        }}
        displayEmpty
      >
        <MenuItem value="all">Todas</MenuItem>
        {years.map((y) => (
          <MenuItem key={y} value={y}>
            {y}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

// ─── KPI Summary Card ─────────────────────────────────────────────────────────

interface KpiSummaryCardProps {
  title: string;
  color: string;
  Icon: React.ElementType;
  primaryValue: number | string;
  primaryLabel: string;
  secondaryValue: number | string;
  secondaryLabel: string;
  isLoading?: boolean;
  hasError?: boolean;
}

const KpiSummaryCard: FC<KpiSummaryCardProps> = ({
  title,
  color,
  Icon,
  primaryValue,
  primaryLabel,
  secondaryValue,
  secondaryLabel,
  isLoading,
  hasError,
}) => {
  if (isLoading) {
    return (
      <Card
        sx={{
          flex: 1,
          p: 2,
          borderRadius: "12px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
          backgroundColor: alpha(color, 0.1),
        }}
      >
        <Stack spacing={1}>
          <Skeleton variant="text" width={120} height={20} />
          <Skeleton variant="text" width={80} height={40} />
          <Skeleton variant="text" width={100} height={20} />
        </Stack>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card
        sx={{
          flex: 1,
          p: 2,
          borderRadius: "12px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
          backgroundColor: alpha(color, 0.1),
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
          Error al cargar datos
        </Typography>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        flex: 1,
        p: 2,
        borderRadius: "12px",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        backgroundColor: alpha(color, 0.1),
      }}
    >
      <Box className="flex w-full justify-between items-start">
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Box
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          sx={{ backgroundColor: alpha(color, 0.2), color }}
        >
          <Icon />
        </Box>
      </Box>
      <Box sx={{ mt: 1 }}>
        <Stack direction="row" alignItems="baseline" spacing={0.5}>
          <Typography variant="h5" fontWeight={700}>
            {typeof primaryValue === "number"
              ? formatNumber(primaryValue)
              : primaryValue}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {primaryLabel}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            |
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {typeof secondaryValue === "number"
              ? formatNumber(secondaryValue)
              : secondaryValue}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {secondaryLabel}
          </Typography>
        </Stack>
      </Box>
    </Card>
  );
};

// ─── Sector Chart Card ────────────────────────────────────────────────────────

type SectorTab = "companies" | "emissions";

interface SectorChartCardProps {
  year?: number;
}

const SectorChartCard: FC<SectorChartCardProps> = ({ year }) => {
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
        <Box className="flex justify-between items-center mb-4">
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
          <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Skeleton variant="rectangular" width="100%" height={180} />
          </Box>
        )}

        {!isLoading && isError && (
          <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="body2" color="error.main">
              Error al cargar los datos
            </Typography>
          </Box>
        )}

        {!isLoading && !isError && chartData.length === 0 && (
          <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
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

// ─── Category Chart Card ──────────────────────────────────────────────────────

interface CategoryChartCardProps {
  year?: number;
}

const CategoryChartCard: FC<CategoryChartCardProps> = ({ year }) => {
  const [selectedMethodologyIdx, setSelectedMethodologyIdx] = useState(0);
  const { data, isLoading, isError } = useAdminDashboardCategoryChart(year);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (isError) {
      enqueueSnackbar("Error al cargar el gráfico de categorías", {
        variant: "error",
      });
    }
  }, [isError, enqueueSnackbar]);

  const methodologies = data?.methodologies ?? [];
  const selectedMethodology = methodologies[selectedMethodologyIdx];
  const hasMultipleMethodologies = methodologies.length > 1;

  const pieData = useMemo(() => {
    if (!selectedMethodology) return [];
    return selectedMethodology.categoryEmissions
      .filter((c) => c.totalEmissions > 0)
      .map((c, idx) => ({
        id: idx,
        value: c.totalEmissions,
        label: c.categoryName,
      }));
  }, [selectedMethodology]);

  const totalEmissions = useMemo(
    () => pieData.reduce((sum, d) => sum + d.value, 0),
    [pieData]
  );

  return (
    <Card
      sx={{
        borderRadius: "12px",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        height: "100%",
      }}
    >
      <CardContent>
        <Box className="flex justify-between items-center mb-2">
          <Typography variant="h6" fontWeight={700}>
            Distribución por Alcance
          </Typography>
          {hasMultipleMethodologies && !isLoading && !isError && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={selectedMethodologyIdx}
                onChange={(e) =>
                  setSelectedMethodologyIdx(Number(e.target.value))
                }
              >
                {methodologies.map((mv, idx) => (
                  <MenuItem key={mv.methodologyVersionId} value={idx}>
                    {mv.methodologyVersionName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {isLoading && (
          <Box sx={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Skeleton variant="circular" width={160} height={160} />
          </Box>
        )}

        {!isLoading && isError && (
          <Box sx={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="body2" color="error.main">
              Error al cargar los datos
            </Typography>
          </Box>
        )}

        {!isLoading && !isError && methodologies.length === 0 && (
          <Box sx={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Sin datos disponibles
            </Typography>
          </Box>
        )}

        {!isLoading && !isError && methodologies.length > 0 && totalEmissions === 0 && (
          <Box sx={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Sin datos disponibles
            </Typography>
          </Box>
        )}

        {!isLoading && !isError && methodologies.length > 0 && totalEmissions > 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
            <Box sx={{ position: "relative" }}>
              <PieChart
                series={[
                  {
                    data: pieData,
                    innerRadius: 55,
                    outerRadius: 80,
                    paddingAngle: 1,
                    cornerRadius: 2,
                  },
                ]}
                width={260}
                height={195}
                hideLegend={false}
                margin={{ top: 0, bottom: 0, left: 40, right: 40 }}
              />
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <Typography variant="h6" fontWeight="fontWeightSemiBold">
                  {formatNumber(totalEmissions)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  tCO₂e
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Requests Summary Card ────────────────────────────────────────────────────

const RECOGNITION_TYPES = [
  SubmissionType.CARBON_INVENTORY_CALCULATION,
  SubmissionType.CARBON_INVENTORY_VERIFICATION,
  SubmissionType.REDUCTION_PLAN_VERIFICATION,
  SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
] as const;

const RECOGNITION_TYPES_SET = new Set<string>(RECOGNITION_TYPES);

const RECOGNITION_TYPE_LABELS: Record<
  (typeof RECOGNITION_TYPES)[number],
  string
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "Diploma Medición",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "Diploma Verificación",
  [SubmissionType.REDUCTION_PLAN_VERIFICATION]: "Diploma Reducción",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: "Diploma Neutralización",
};

const RequestStatusCard: FC<{
  label: string;
  color: string;
  Icon: React.ElementType;
  primary: number;
  primaryLabel?: string;
  secondary?: number;
  secondaryLabel?: string;
}> = ({ label, color, Icon, primary, primaryLabel, secondary, secondaryLabel }) => (
  <Card
    sx={{
      flex: 1,
      p: 2,
      borderRadius: "12px",
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      backgroundColor: alpha(color, 0.08),
    }}
  >
    <Box className="flex w-full justify-between">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box
        className="flex h-8 w-8 items-center justify-center rounded-lg"
        sx={{ backgroundColor: alpha(color, 0.15), color }}
      >
        <Icon fontSize="small" />
      </Box>
    </Box>
    {secondary !== undefined ? (
      <Box sx={{ mt: 1 }}>
        <Stack direction="row" alignItems="baseline" spacing={0.5}>
          <Typography variant="h5" fontWeight={700}>
            {formatNumber(primary)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {primaryLabel}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            |
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {formatNumber(secondary)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {secondaryLabel}
          </Typography>
        </Stack>
      </Box>
    ) : (
      <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
        {formatNumber(primary)}
      </Typography>
    )}
  </Card>
);

type RequestsTab = "inscription" | "recognitions";

interface RequestsSummaryCardProps {
  year?: number;
}

const RequestsSummaryCard: FC<RequestsSummaryCardProps> = ({ year }) => {
  const [activeTab, setActiveTab] = useState<RequestsTab>("recognitions");
  const { data, isLoading, isError } = useAdminRequestsKpis(year);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  useEffect(() => {
    if (isError) {
      enqueueSnackbar("Error al cargar el resumen de postulaciones", {
        variant: "error",
      });
    }
  }, [isError, enqueueSnackbar]);

  const { pendingCount, approvedCount, approvedAutoCount, reviewedCount } =
    useMemo(() => {
      if (!data) {
        return {
          pendingCount: 0,
          approvedCount: 0,
          approvedAutoCount: 0,
          reviewedCount: 0,
        };
      }

      const typesToCount =
        activeTab === "inscription"
          ? [SubmissionType.ORGANIZATION_ACCREDITATION]
          : RECOGNITION_TYPES;

      let pending = 0;
      let approved = 0;
      let approvedAuto = 0;
      let reviewed = 0;

      for (const entry of data.counts) {
        if (!typesToCount.some((t) => t === entry.type)) continue;
        if (entry.status === SubmissionStatus.PENDING) pending += entry.value;
        if (entry.status === SubmissionStatus.APPROVED) approved += entry.value;
        if (entry.status === SubmissionStatus.APPROVED_AUTOMATICALLY)
          approvedAuto += entry.value;
        if (entry.status === SubmissionStatus.REVIEWED) reviewed += entry.value;
      }

      return {
        pendingCount: pending,
        approvedCount: approved,
        approvedAutoCount: approvedAuto,
        reviewedCount: reviewed,
      };
    }, [data, activeTab]);

  return (
    <Card
      sx={{
        borderRadius: "12px",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      <CardContent>
        <Box className="flex justify-between items-center mb-4">
          <Typography variant="h6" fontWeight={700}>
            Resumen de Postulaciones
          </Typography>
          <Tabs
            value={activeTab}
            onChange={(_, val: RequestsTab) => setActiveTab(val)}
            sx={{ minHeight: "unset" }}
          >
            <Tab
              label="Inscripción"
              value="inscription"
              sx={{ minHeight: "unset", py: 0.5, px: 1, fontSize: "0.75rem" }}
            />
            <Tab
              label="Reconocimientos"
              value="recognitions"
              sx={{ minHeight: "unset", py: 0.5, px: 1, fontSize: "0.75rem" }}
            />
          </Tabs>
        </Box>

        {isLoading ? (
          <Stack direction="row" spacing={2}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                sx={{ flex: 1, borderRadius: "12px", height: 100 }}
              />
            ))}
          </Stack>
        ) : isError ? (
          <Typography variant="body2" color="error.main">
            Error al cargar los datos
          </Typography>
        ) : (
          <Stack direction="row" spacing={2}>
            <RequestStatusCard
              label="Pendientes"
              color={theme.palette.warning.dark}
              Icon={AccessTimeOutlined}
              primary={pendingCount}
            />
            <RequestStatusCard
              label="Aprobadas"
              color={theme.palette.success.dark}
              Icon={CheckCircleOutlined}
              primary={approvedCount}
              primaryLabel="Manual"
              secondary={approvedAutoCount}
              secondaryLabel="Automática"
            />
            <RequestStatusCard
              label="Revisadas"
              color={theme.palette.info.dark}
              Icon={DisabledVisibleOutlined}
              primary={reviewedCount}
            />
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Recognition Type Cards ───────────────────────────────────────────────────

const RecognitionTypeCard: FC<{
  label: string;
  approved: number;
  approvedAuto: number;
  color: string;
  showPaired?: boolean;
}> = ({ label, approved, approvedAuto, color, showPaired = false }) => (
  <Card
    sx={{
      flex: 1,
      p: 2,
      borderRadius: "12px",
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      backgroundColor: alpha(color, 0.08),
    }}
  >
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
      {label}
    </Typography>
    {showPaired ? (
      <Stack direction="row" alignItems="baseline" spacing={0.5}>
        <Typography variant="h5" fontWeight={700}>
          {formatNumber(approved)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Manual
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          |
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          {formatNumber(approvedAuto)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Automática
        </Typography>
      </Stack>
    ) : (
      <Typography variant="h4" fontWeight={700}>
        {formatNumber(approved + approvedAuto)}
      </Typography>
    )}
  </Card>
);

interface RecognitionTypeCardsProps {
  year?: number;
}

const RecognitionTypeCards: FC<RecognitionTypeCardsProps> = ({ year }) => {
  const { data, isLoading, isError } = useAdminRequestsKpis(year);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  useEffect(() => {
    if (isError) {
      enqueueSnackbar("Error al cargar los reconocimientos otorgados", {
        variant: "error",
      });
    }
  }, [isError, enqueueSnackbar]);

  const recognitionData = useMemo(() => {
    if (!data) {
      return {
        total: 0,
        byType: {} as Record<string, { approved: number; approvedAuto: number }>,
      };
    }

    const byType: Record<
      string,
      { approved: number; approvedAuto: number }
    > = {};

    for (const type of RECOGNITION_TYPES) {
      byType[type] = { approved: 0, approvedAuto: 0 };
    }

    for (const entry of data.counts) {
      if (!RECOGNITION_TYPES_SET.has(entry.type)) continue;
      if (entry.status === SubmissionStatus.APPROVED) {
        byType[entry.type].approved += entry.value;
      }
      if (entry.status === SubmissionStatus.APPROVED_AUTOMATICALLY) {
        byType[entry.type].approvedAuto += entry.value;
      }
    }

    const total = Object.values(byType).reduce(
      (sum, t) => sum + t.approved + t.approvedAuto,
      0
    );

    return { total, byType };
  }, [data]);

  const color = theme.palette.success.dark;

  if (isLoading) {
    return (
      <Stack direction="row" spacing={2}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            sx={{ flex: 1, borderRadius: "12px", height: 100 }}
          />
        ))}
      </Stack>
    );
  }

  if (isError) {
    return (
      <Card
        sx={{
          p: 2,
          borderRadius: "12px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Typography variant="body2" color="error.main">
          Error al cargar los datos
        </Typography>
      </Card>
    );
  }

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap">
      {/* Total card */}
      <RecognitionTypeCard
        label="Total Reconocimientos"
        approved={recognitionData.total}
        approvedAuto={0}
        color={color}
      />
      {RECOGNITION_TYPES.map((type) => {
        const typeData = recognitionData.byType[type] ?? {
          approved: 0,
          approvedAuto: 0,
        };
        return (
          <RecognitionTypeCard
            key={type}
            label={RECOGNITION_TYPE_LABELS[type]}
            approved={typeData.approved}
            approvedAuto={typeData.approvedAuto}
            color={color}
            showPaired={type === SubmissionType.CARBON_INVENTORY_CALCULATION}
          />
        );
      })}
    </Stack>
  );
};

// ─── Main Dashboard Screen ────────────────────────────────────────────────────

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
        <Stack direction="row" justifyContent="space-between" alignItems="center">
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
