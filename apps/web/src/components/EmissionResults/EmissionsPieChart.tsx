import { FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { useTheme } from "@mui/material/styles";
import { EmptyStateMessage } from "./EmptyStateMessage";
import { LoadingErrorStateMessage } from "./LoadingErrorStateMessage";

interface CategoryData {
  name: string;
  subtotal: number;
  percentage: number;
}

interface EmissionsPieChartProps {
  categories: CategoryData[];
  totalEmissions: number;
  showLegend?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
}

const formatNumber = (value: number): string =>
  value.toLocaleString("es", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const EmissionsPieChart: FC<EmissionsPieChartProps> = ({
  categories,
  totalEmissions,
  showLegend = false,
  isLoading = false,
  hasError = false,
}) => {
  const theme = useTheme();

  const categoryColors = [
    theme.palette.category[1].main,
    theme.palette.category[2].main,
    theme.palette.category[3].main,
  ];

  const pieData = categories.map((cat, index) => ({
    id: index,
    value: cat.subtotal,
    label: cat.name,
    color: categoryColors[index % categoryColors.length],
  }));

  return (
    <Box className="flex h-full w-full flex-col gap-4 rounded-xl border border-gray-300 p-4">
      <Typography variant="body1" fontWeight="fontWeightMedium">
        Tus emisiones más importantes en tCO₂e
      </Typography>

      {isLoading && (
        <Box className="flex flex-1 flex-col items-center justify-center gap-3 pt-3">
          <Skeleton variant="circular" width={160} height={160} />
        </Box>
      )}

      {!isLoading && hasError && (
        <LoadingErrorStateMessage message="Ocurrió un error al cargar el gráfico de emisiones" />
      )}

      {!isLoading && !hasError && !!totalEmissions && (
        <Box className="flex flex-1 flex-col items-center justify-center gap-3 pt-3">
          <Box className="relative">
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
              hideLegend={!showLegend}
              margin={{ top: 0, bottom: 0, left: 40, right: 40 }}
            />
            <Box className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <Typography
                variant="h6"
                fontWeight="fontWeightSemiBold"
                color="text.primary"
              >
                {formatNumber(totalEmissions)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                tCO₂e
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {!isLoading && !totalEmissions && !hasError && (
        <EmptyStateMessage
          message={
            "Cuando registres tus actividades, verás aquí un resumen por alcance"
          }
        />
      )}
    </Box>
  );
};
