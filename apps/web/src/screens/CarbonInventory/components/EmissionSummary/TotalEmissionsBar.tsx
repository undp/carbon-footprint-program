import { FC } from "react";
import { Box, Skeleton, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { formatter } from "@/utils/formatting";
import type { GetEmissionsDetailedSummaryResponse } from "@repo/types";

interface TotalEmissionsBarProps {
  totalEmissions: number;
  equivalence: GetEmissionsDetailedSummaryResponse["equivalence"];
  isLoading?: boolean;
}

export const TotalEmissionsBar: FC<TotalEmissionsBarProps> = ({
  totalEmissions,
  equivalence,
  isLoading = false,
}) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Skeleton
        variant="rounded"
        height={80}
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
          fontWeight="fontWeightMedium"
          sx={{ color: theme.palette.common.deepForest }}
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
          {formatter.emissions(totalEmissions)}
        </Typography>
        {equivalence?.rate != null && !!equivalence?.activityName && (
          <Typography
            variant="caption"
            sx={{ color: theme.palette.common.deepForest, opacity: 0.7 }}
          >
            Equivalencia: {formatter.rate(equivalence.rate)} kg CO₂e/
            {equivalence.activityName}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
