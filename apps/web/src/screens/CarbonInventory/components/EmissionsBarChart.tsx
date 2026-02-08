import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { useTheme, alpha } from "@mui/material/styles";

interface EmissionDataPoint {
  label: string;
  value: number;
  category: 1 | 2 | 3;
}

interface EmissionsBarChartProps {
  data: EmissionDataPoint[];
}

export const EmissionsBarChart: FC<EmissionsBarChartProps> = ({ data }) => {
  const theme = useTheme();

  // Generate colors based on category
  const colors = data.map((item) =>
    alpha(theme.palette.category[item.category].main, 0.5)
  );

  return (
    <Box className="flex h-full w-full flex-col gap-2 rounded-xl border border-grey-300 bg-white p-4">
      <Typography variant="body1" fontWeight="fontWeightMedium">
        Tus emisiones más importantes en tCO₂e
      </Typography>

      <Box className="flex flex-1 flex-col">
        <BarChart
          series={[
            {
              data: data.map((item) => item.value),
              label: "Emisiones",
            },
          ]}
          xAxis={[
            {
              data: data.map((item) => item.label),
              scaleType: "band",
              categoryGapRatio: 0.5,
            },
          ]}
          yAxis={[
            {
              label: "tCO₂e",
            },
          ]}
          colors={colors}
          height={240}
          margin={{ left: 40, right: 10, top: 10, bottom: 60 }}
          hideLegend
        />
      </Box>

      <Box className="flex items-center justify-center gap-6">
        <Box className="flex items-center gap-1">
          <Box className="size-2 bg-[#ffe9ca]" />
          <Typography variant="caption">Alcance 1</Typography>
        </Box>
        <Box className="flex items-center gap-1">
          <Box className="size-2 bg-[#d0e9fc]" />
          <Typography variant="caption">Alcance 2</Typography>
        </Box>
        <Box className="flex items-center gap-1">
          <Box className="size-2 bg-[#d9eeda]" />
          <Typography variant="caption">Alcance 3</Typography>
        </Box>
      </Box>
    </Box>
  );
};
