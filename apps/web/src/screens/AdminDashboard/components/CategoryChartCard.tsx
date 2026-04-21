import { FC, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  FormControl,
  MenuItem,
  Select,
  Skeleton,
  Typography,
} from "@mui/material";
import { PieChart, pieArcLabelClasses } from "@mui/x-charts/PieChart";
import { useSnackbar } from "notistack";
import { useAdminDashboardCategoryChart } from "@/api/query/dashboard";
import { formatEmissions, formatAsPercentage } from "../../../utils/formatting";

interface CategoryChartCardProps {
  year?: number;
}

export const CategoryChartCard: FC<CategoryChartCardProps> = ({ year }) => {
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
  const clampedIdx =
    methodologies.length > 0
      ? Math.min(selectedMethodologyIdx, methodologies.length - 1)
      : 0;
  const selectedMethodology = methodologies[clampedIdx];
  const hasMultipleMethodologies = methodologies.length > 1;

  const totalEmissions = useMemo(
    () =>
      selectedMethodology?.categoryEmissions.reduce(
        (sum, d) => sum + d.totalEmissions,
        0
      ) ?? 0,
    [selectedMethodology]
  );

  const filteredCategories = useMemo(() => {
    if (!selectedMethodology) return [];
    return selectedMethodology.categoryEmissions.filter(
      (c) => c.totalEmissions > 0
    );
  }, [selectedMethodology]);

  const pieData = useMemo(
    () =>
      filteredCategories.map((c, idx) => ({
        id: idx,
        value: c.totalEmissions,
        label: c.categoryName,
      })),
    [filteredCategories]
  );

  const pieColors = useMemo(
    () => filteredCategories.map((c) => c.categoryColor),
    [filteredCategories]
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
        <Box className="mb-2 flex items-center justify-between">
          <Typography variant="h6" fontWeight={700}>
            Distribución por Alcance
          </Typography>
          {hasMultipleMethodologies && !isLoading && !isError && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={clampedIdx}
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
          <Box
            sx={{
              height: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Skeleton variant="circular" width={160} height={160} />
          </Box>
        )}

        {!isLoading && isError && (
          <Box
            sx={{
              height: 220,
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

        {!isLoading && !isError && methodologies.length === 0 && (
          <Box
            sx={{
              height: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No hay huellas autodeclaradas para el año seleccionado
            </Typography>
          </Box>
        )}

        {!isLoading &&
          !isError &&
          methodologies.length > 0 &&
          totalEmissions === 0 && (
            <Box
              sx={{
                height: 220,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No hay emisiones autodeclaradas para el año seleccionado
              </Typography>
            </Box>
          )}

        {!isLoading &&
          !isError &&
          methodologies.length > 0 &&
          totalEmissions > 0 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
              <PieChart
                colors={pieColors}
                sx={{
                  [`& .${pieArcLabelClasses.root}`]: {
                    fontSize: "12px",
                  },
                }}
                series={[
                  {
                    data: pieData,
                    innerRadius: 40,
                    outerRadius: 80,
                    paddingAngle: 3,
                    cornerRadius: 2,
                    arcLabel: (item) =>
                      `${formatAsPercentage(item.value, totalEmissions)}`,
                    arcLabelRadius: 100,
                    valueFormatter: (item) => formatEmissions(item.value, true),
                    highlightScope: { fade: "global", highlight: "item" },
                    highlighted: { additionalRadius: 2 },
                  },
                ]}
                width={260}
                height={210}
              />
            </Box>
          )}
      </CardContent>
    </Card>
  );
};
