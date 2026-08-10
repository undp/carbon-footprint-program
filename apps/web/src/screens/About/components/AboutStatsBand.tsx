import { FC } from "react";
import { Box } from "@mui/material";
import { HighlightStatCard } from "@/components";
import { ABOUT_STATS, ABOUT_STATS_OVERLAP } from "../constants";

/**
 * Banda de cifras destacadas. Se monta sobre el borde inferior del hero, así
 * que el margen superior negativo es parte del diseño.
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
