import { FC } from "react";
import { Box } from "@mui/material";
import { HighlightStatCard } from "@/components";
import { ABOUT_STATS, ABOUT_STATS_OVERLAP } from "../constants";

/**
 * Band of highlight figures. It mounts over the hero's bottom edge, so the
 * negative top margin is part of the design.
 */
export const AboutStatsBand: FC = () => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
      gap: 2,
      mt: `-${ABOUT_STATS_OVERLAP}px`,
      position: "relative",
      zIndex: 3,
    }}
  >
    {ABOUT_STATS.map((stat) => (
      <HighlightStatCard
        key={stat.label}
        value={stat.value}
        label={stat.label}
      />
    ))}
  </Box>
);
