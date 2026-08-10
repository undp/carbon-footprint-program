import { FC } from "react";
import { RouteOutlined } from "@mui/icons-material";
import { Box, Paper } from "@mui/material";
import { SectionHeading } from "@/components";
import { ABOUT_SECTION_TITLES, ROADMAP_MILESTONES } from "../constants";
import { RoadmapMilestoneItem } from "./RoadmapMilestoneItem";

/** Sección "El camino — dónde estamos": línea de tiempo del proyecto. */
export const RoadmapSection: FC = () => (
  <Box component="section">
    <SectionHeading Icon={RouteOutlined} title={ABOUT_SECTION_TITLES.roadmap} />
    <Paper variant="outlined" sx={{ borderRadius: 4, px: 4.5, py: 4.25 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(5, 1fr)",
          },
          rowGap: 4,
        }}
      >
        {ROADMAP_MILESTONES.map((milestone, index) => (
          <RoadmapMilestoneItem
            key={`${milestone.period}-${milestone.title}`}
            milestone={milestone}
            isLast={index === ROADMAP_MILESTONES.length - 1}
          />
        ))}
      </Box>
    </Paper>
  </Box>
);
