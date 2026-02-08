import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { useTheme } from "@mui/material/styles";

interface CategoryData {
  name: string;
  subtotal: number;
  percentage: number;
}

interface EmissionsPieChartProps {
  categories: CategoryData[];
  totalEmissions: number;
}

const formatNumber = (value: number): string =>
  value.toLocaleString("es-CL", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

export const EmissionsPieChart: FC<EmissionsPieChartProps> = ({
  categories,
  totalEmissions,
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
    label: `${cat.name} (${formatNumber(cat.subtotal)})`,
    color: categoryColors[index % categoryColors.length],
  }));

  return (
    <Box className="flex h-full w-full flex-col gap-2 rounded-xl border border-grey-300 p-4">
      <Typography variant="body1" fontWeight="fontWeightMedium">
        Tus emisiones más importantes en tCO₂e
      </Typography>

      <Box className="flex flex-1 items-center justify-center pt-3">
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
            hideLegend
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
    </Box>
  );
};
