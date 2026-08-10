import { FC } from "react";
import { Box, Chip, Paper, Typography, darken, useTheme } from "@mui/material";
import { PARTNERS, PartnerId } from "@/config/partners";
import { FUNDING_HIGHLIGHT } from "../constants";

/** Reconocimiento al socio que financia la iniciativa. */
export const FundingHighlightCard: FC = () => {
  const theme = useTheme();

  const funder = PARTNERS[PartnerId.SWEDEN];

  return (
    <Paper
      variant="outlined"
      className="flex flex-wrap items-center gap-9"
      sx={{
        borderRadius: 3.5,
        borderLeft: `5px solid ${funder.brandColor}`,
        px: 4.5,
        py: 3.75,
      }}
    >
      <Box
        component="img"
        src={funder.logoSrc}
        alt={funder.name}
        sx={{ height: 52, width: "auto", flexShrink: 0 }}
      />
      <Box sx={{ flex: 1, minWidth: { xs: 0, md: 300 } }}>
        <Chip
          label={FUNDING_HIGHLIGHT.badge}
          size="small"
          sx={{
            borderRadius: 1,
            mb: 1.25,
            fontSize: 10.5,
            fontWeight: "fontWeightBold",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            backgroundColor: theme.palette.common.sunflower,
            color: darken(theme.palette.common.sunflower, 0.8),
          }}
        />
        <Typography
          variant="h6"
          component="h3"
          fontWeight="fontWeightBold"
          sx={{ fontSize: 19, color: funder.brandColor, mb: 1 }}
        >
          {FUNDING_HIGHLIGHT.title}
        </Typography>
        <Typography
          variant="body2"
          color="text.primary"
          sx={{ fontSize: 14.5, lineHeight: 1.7 }}
        >
          {FUNDING_HIGHLIGHT.bodyBeforeProject}{" "}
          <Box component="em">“{FUNDING_HIGHLIGHT.projectName}”</Box>
          {FUNDING_HIGHLIGHT.bodyAfterProject}
        </Typography>
      </Box>
    </Paper>
  );
};
