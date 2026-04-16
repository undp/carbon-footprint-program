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
import { PieChart } from "@mui/x-charts/PieChart";
import { useSnackbar } from "notistack";
import { useAdminDashboardCategoryChart } from "@/api/query/dashboard";
import { formatNumber } from "../constants";

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
        <Box className="mb-2 flex items-center justify-between">
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
              Sin datos disponibles
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
                Sin datos disponibles
              </Typography>
            </Box>
          )}

        {!isLoading &&
          !isError &&
          methodologies.length > 0 &&
          totalEmissions > 0 && (
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
