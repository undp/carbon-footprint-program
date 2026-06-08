import { FC } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { WarningRounded } from "@mui/icons-material";
import { formatter } from "@/utils/formatting";
import { getColorPalette } from "@/utils/categoryColors";

interface EmissionPercentageBadgeProps {
  emissions: number;
  percentage?: number | null;
  categoryColor: string;
  highlighted?: boolean;
  /**
   * When set, renders a warning icon with this tooltip next to the value to
   * flag that the total is provisional (e.g. it has activities still pending).
   */
  provisionalTooltip?: string;
}

export const EmissionPercentageBadge: FC<EmissionPercentageBadgeProps> = ({
  emissions,
  percentage,
  categoryColor,
  highlighted = false,
  provisionalTooltip,
}) => {
  const categoryColorPalette = getColorPalette(categoryColor);
  const fontWeight = highlighted ? "600" : "400";
  const hasPercentage = percentage !== null && percentage !== undefined;
  return (
    <Box className="flex items-center gap-4">
      <Box className="flex items-center gap-1">
        {provisionalTooltip && (
          <Tooltip title={provisionalTooltip} placement="top">
            <WarningRounded
              sx={(theme) => ({
                color: theme.palette.warning.main,
                height: 20,
              })}
            />
          </Tooltip>
        )}
        <Typography
          variant="body1"
          fontWeight={fontWeight}
          sx={{ color: categoryColorPalette.dark }}
        >
          {formatter.emissions(emissions)}
        </Typography>
      </Box>
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
