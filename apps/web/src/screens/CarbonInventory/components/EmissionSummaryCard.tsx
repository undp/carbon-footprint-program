import { FC } from "react";
import { Box, Typography, alpha } from "@mui/material";

interface EmissionSummaryCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: string;
  percentage?: string;
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
      className="flex w-full flex-col items-start justify-center gap-2 rounded-lg p-3"
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
              sx={{ color: textColor }}
            >
              {title}
            </Typography>
            <Typography variant="caption" sx={{ color: textColor }}>
              {subtitle}
            </Typography>
          </Box>
        </Box>
        <Box className="flex items-center gap-4">
          <Typography
            variant="body1"
            fontWeight="fontWeightSemiBold"
            sx={{ color: textColor }}
          >
            {value}
          </Typography>
          {percentage && (
            <Box
              className="flex h-8 items-center justify-center rounded px-1"
              sx={{ backgroundColor }}
            >
              <Typography
                variant="h6"
                fontWeight="fontWeightSemiBold"
                sx={{ color: textColor }}
              >
                {percentage}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
