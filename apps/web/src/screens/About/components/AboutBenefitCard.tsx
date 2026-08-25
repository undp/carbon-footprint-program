import { FC } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import type { AboutBenefit } from "../constants";

interface Props {
  benefit: AboutBenefit;
}

/** One of the three things the platform does for an organization. */
export const AboutBenefitCard: FC<Props> = ({ benefit }) => {
  const theme = useTheme();

  return (
    <Box className="flex flex-col gap-2">
      <Box
        className="mb-1 flex h-12 w-12 items-center justify-center rounded-full"
        sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.09) }}
      >
        <benefit.Icon
          sx={{ fontSize: 24, color: theme.palette.primary.main }}
        />
      </Box>
      <Typography
        variant="h6"
        component="h3"
        fontWeight="fontWeightBold"
        sx={{ fontSize: 18, color: theme.palette.primary.main }}
      >
        {benefit.title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontSize: 14.5, lineHeight: 1.7 }}
      >
        {benefit.body}
      </Typography>
    </Box>
  );
};
