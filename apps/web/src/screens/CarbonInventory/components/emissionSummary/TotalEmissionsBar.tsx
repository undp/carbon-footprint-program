import { FC } from "react";
import { Box, Skeleton, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { formatEmissions } from "@/utils/formatting";
import type { GetEmissionsSummaryFullResponse } from "@repo/types";

type Equivalence = GetEmissionsSummaryFullResponse["equivalence"];

interface TotalEmissionsBarProps {
  totalEmissions: number;
  equivalence: Equivalence;
  isLoading: boolean;
}

export const TotalEmissionsBar: FC<TotalEmissionsBarProps> = ({
  totalEmissions,
  equivalence,
  isLoading,
}) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Skeleton
        variant="rounded"
        height={56}
        sx={{ borderRadius: 2, flexShrink: 0 }}
      />
    );
  }

  return (
    <Box
      className="flex items-center justify-between rounded-lg px-4 py-3"
      sx={{ backgroundColor: alpha(theme.palette.common.deepForest, 0.1) }}
    >
      <Box>
        <Typography
          variant="subtitle1"
          fontWeight="fontWeightSemiBold"
          sx={{ color: theme.palette.common.deepForest, fontWeight: 600 }}
        >
          Total emisiones
        </Typography>
      </Box>
      <Box className="text-right">
        <Typography
          variant="h6"
          fontWeight="fontWeightBold"
          sx={{ color: theme.palette.common.deepForest }}
        >
          {formatEmissions(totalEmissions)}
        </Typography>
        {equivalence && (
          <Typography
            variant="caption"
            sx={{ color: theme.palette.common.deepForest, opacity: 0.7 }}
          >
            Equivalencia:{" "}
            {equivalence.rate.toLocaleString("es-CL", {
              maximumFractionDigits: 2,
            })}{" "}
            kg CO₂e/{equivalence.activityName}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
