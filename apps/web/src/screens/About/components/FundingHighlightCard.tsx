import { FC } from "react";
import { Box, Chip, Paper, Typography, darken, useTheme } from "@mui/material";
import { PARTNERS, PartnerId } from "@/config/partners";
import { FUNDING_HIGHLIGHT } from "../constants";

/** Acknowledgement of the partner that funds the initiative. */
export const FundingHighlightCard: FC = () => {
  const theme = useTheme();

  const funder = PARTNERS[PartnerId.SWEDEN];

  return (
    <Paper
      variant="outlined"
      className="flex flex-col gap-4"
      sx={{
        borderRadius: 3.5,
        borderLeft: `5px solid ${funder.brandColor}`,
        px: 4.5,
        py: 3.75,
      }}
    >
      <Chip
        label={FUNDING_HIGHLIGHT.badge}
        size="small"
        sx={{
          alignSelf: "flex-start",
          borderRadius: 1,
          fontSize: 10.5,
          fontWeight: "fontWeightBold",
          letterSpacing: "1.2px",
          textTransform: "uppercase",
          backgroundColor: theme.palette.common.sunflower,
          color: darken(theme.palette.common.sunflower, 0.8),
        }}
      />
      <Box className="flex flex-wrap items-center gap-9">
        <Box
          component="img"
          src={funder.logoSrc}
          alt={funder.name}
          sx={{ height: 52, width: "auto", flexShrink: 0 }}
        />
        <Box sx={{ flex: 1, minWidth: { xs: 0, md: 300 } }}>
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
      </Box>
    </Paper>
  );
};
