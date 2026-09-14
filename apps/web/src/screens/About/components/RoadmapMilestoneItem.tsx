import { FC } from "react";
import { alpha, Box, Chip, Typography, useTheme } from "@mui/material";
import type { RoadmapMilestone } from "../constants";

interface Props {
  milestone: RoadmapMilestone;
  /** The last milestone fades its bar because the road is still open. */
  isLast: boolean;
}

/** Milestone in the "El camino — dónde estamos" timeline. */
export const RoadmapMilestoneItem: FC<Props> = ({ milestone, isLast }) => {
  const theme = useTheme();

  const accentColor = milestone.isInProgress
    ? theme.palette.warning.main
    : theme.palette.primary.main;
  const stageColor = milestone.isInProgress
    ? theme.palette.warning.dark
    : theme.palette.primary.dark;

  return (
    <Box sx={{ pr: { xs: 0, md: 2.75 } }}>
      <Typography
        component="p"
        sx={{
          fontSize: 11.5,
          fontWeight: "fontWeightBold",
          letterSpacing: "1.2px",
          textTransform: "uppercase",
          color: stageColor,
          mb: 1.75,
        }}
      >
        {milestone.period}
      </Typography>
      <Box
        aria-hidden
        sx={{
          position: "relative",
          height: 4,
          borderRadius: 1,
          mb: 2.75,
          background: isLast
            ? `linear-gradient(90deg, ${accentColor}, ${alpha(accentColor, 0)})`
            : accentColor,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: -5,
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: accentColor,
            border: `3px solid ${theme.palette.common.white}`,
            boxShadow: `0 0 0 3px ${alpha(accentColor, 0.2)}`,
          }}
        />
      </Box>
      <Chip
        label={milestone.stage}
        size="small"
        sx={{
          borderRadius: 1,
          mb: 1.25,
          fontSize: 10,
          fontWeight: "fontWeightBold",
          letterSpacing: "1.1px",
          textTransform: "uppercase",
          color: stageColor,
          backgroundColor: alpha(accentColor, 0.14),
        }}
      />
      <Typography
        variant="subtitle2"
        component="h3"
        fontWeight="fontWeightBold"
        sx={{
          fontSize: 15,
          lineHeight: 1.35,
          color: theme.palette.common.deepForestDark,
          mb: 0.75,
        }}
      >
        {milestone.title}
      </Typography>
      <Typography
        variant="body2"
        color="text.primary"
        sx={{ fontSize: 13.5, lineHeight: 1.6 }}
      >
        {milestone.description}
      </Typography>
    </Box>
  );
};
