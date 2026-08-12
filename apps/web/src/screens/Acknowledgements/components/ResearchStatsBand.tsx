import { FC } from "react";
import { Box } from "@mui/material";
import { HighlightStatCard } from "@/components";
import { RESEARCH_STATS, RESEARCH_STATS_OVERLAP } from "../constants";

/** Research-process figures, mounted over the edge of the hero. */
export const ResearchStatsBand: FC = () => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(210px, 100%), 1fr))",
      gap: 2.25,
      mt: `-${RESEARCH_STATS_OVERLAP}px`,
      position: "relative",
      zIndex: 3,
    }}
  >
    {RESEARCH_STATS.map((stat) => (
      <HighlightStatCard
        key={stat.label}
        value={stat.value}
        label={stat.label}
        WatermarkIcon={stat.Icon}
      />
    ))}
  </Box>
);
