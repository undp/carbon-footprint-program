import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { formatter } from "@/utils/formatting";
import { getColorPalette } from "@/utils/categoryColors";

interface EmissionPercentageBadgeProps {
  emissions: number;
  percentage?: number | null;
  categoryColor: string;
  highlighted?: boolean;
}

export const EmissionPercentageBadge: FC<EmissionPercentageBadgeProps> = ({
  emissions,
  percentage,
  categoryColor,
  highlighted = false,
}) => {
  const categoryColorPalette = getColorPalette(categoryColor);
  const fontWeight = highlighted ? "600" : "400";
  const hasPercentage = percentage !== null && percentage !== undefined;
  return (
    <Box className="flex items-center gap-4">
      <Typography
        variant="body1"
        fontWeight={fontWeight}
        sx={{ color: categoryColorPalette.dark }}
      >
        {formatter.emissions(emissions)}
      </Typography>
      {hasPercentage && (
        <Box className="flex min-w-[60px] justify-end">
          <Box
            className="rounded px-2 py-1"
            sx={{ backgroundColor: categoryColorPalette.light }}
          >
            <Typography
              variant="body1"
              fontWeight={fontWeight}
              sx={{ color: categoryColorPalette.dark }}
            >
              {formatter.percentage(percentage)}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};
