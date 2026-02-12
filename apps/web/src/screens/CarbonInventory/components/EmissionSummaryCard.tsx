import { FC } from "react";
import { Box, Typography, alpha } from "@mui/material";
import { EmissionPercentageBadge } from "./EmissionSummary/EmissionPercentageBadge";

interface EmissionSummaryCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: number;
  percentage: number;
  backgroundColor: string;
  textColor: string;
  iconColor: string;
}

export const EmissionSummaryCard: FC<EmissionSummaryCardProps> = ({
  icon,
  title,
  subtitle,
  value,
  percentage,
  backgroundColor,
  textColor,
  iconColor,
}) => {
  return (
    <Box
      className="flex w-full flex-1 flex-col items-start justify-center gap-2 rounded-lg px-3 py-2"
      sx={{ backgroundColor }}
    >
      <Box className="flex w-full items-center justify-between">
        <Box className="flex items-center gap-2">
          <Box
            className="flex size-8 items-center justify-center rounded-full"
            sx={{ backgroundColor: alpha(iconColor, 0.3) }}
          >
            <Box className="flex size-[18px] items-center justify-center">
              {icon}
            </Box>
          </Box>
          <Box className="flex flex-col">
            <Typography
              variant="body1"
              fontWeight="fontWeightSemiBold"
              sx={{ color: textColor, lineHeight: 1.2 }}
            >
              {title}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: textColor, lineHeight: 1.2 }}
            >
              {subtitle}
            </Typography>
          </Box>
        </Box>
        <Box className="flex items-center gap-4">
          <EmissionPercentageBadge
            emissions={value}
            percentage={percentage}
            categoryColor={{ dark: textColor, light: backgroundColor }}
          />
        </Box>
      </Box>
    </Box>
  );
};
