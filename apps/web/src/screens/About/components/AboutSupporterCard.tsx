import { FC } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { PARTNERS } from "@/config/partners";
import type { AboutSupporter } from "../constants";

interface Props {
  supporter: AboutSupporter;
}

/** Logo, name and role of one of the initiative's supporters. */
export const AboutSupporterCard: FC<Props> = ({ supporter }) => {
  const theme = useTheme();
  const partner = PARTNERS[supporter.partnerId];

  return (
    <Box className="flex items-start gap-4">
      <Box
        component="img"
        src={partner.logoSrc}
        alt={partner.name}
        sx={{
          height: supporter.logoHeight,
          width: "auto",
          flexShrink: 0,
          display: "block",
        }}
      />
      <Box>
        <Typography
          component="p"
          fontWeight="fontWeightBold"
          sx={{
            fontSize: 14,
            mb: 0.5,
            color: theme.palette.common.deepNavyDark,
          }}
        >
          {partner.name}
        </Typography>
        <Typography
          component="p"
          color="text.secondary"
          sx={{ fontSize: 13.5, lineHeight: 1.65 }}
        >
          {supporter.description}
        </Typography>
      </Box>
    </Box>
  );
};
