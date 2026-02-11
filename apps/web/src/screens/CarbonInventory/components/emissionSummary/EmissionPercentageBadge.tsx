import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { formatEmissions, formatPercentage } from "@/utils/formatting";

interface EmissionPercentageBadgeProps {
  emissions: number;
  percentage: number;
  categoryColor: {
    dark: string;
    light: string;
  };
  highlighted?: boolean;
}

export const EmissionPercentageBadge: FC<EmissionPercentageBadgeProps> = ({
  emissions,
  percentage,
  categoryColor,
  highlighted = false,
}) => {
  const fontWeight = highlighted ? "600" : "400";
  return (
    <Box className="flex items-center gap-4">
      <Typography
        variant="body1"
        fontWeight={fontWeight}
        sx={{ color: categoryColor.dark }}
      >
        {formatEmissions(emissions)}
      </Typography>
      <Box className="flex min-w-[60px] justify-end">
        <Box
          className="rounded px-2 py-1"
          sx={{ backgroundColor: categoryColor.light }}
        >
          <Typography
            variant="body1"
            fontWeight={fontWeight}
            sx={{ color: categoryColor.dark }}
          >
            {formatPercentage(percentage)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
