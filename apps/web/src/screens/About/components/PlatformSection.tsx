import { FC } from "react";
import { EnergySavingsLeafOutlined } from "@mui/icons-material";
import { Box, Paper } from "@mui/material";
import { SectionHeading } from "@/components";
import { ABOUT_SECTION_TITLES, PLATFORM_PILLARS } from "../constants";
import { PlatformPillarCard } from "./PlatformPillarCard";

/** "Qué hace la plataforma" section: measure, report and share. */
export const PlatformSection: FC = () => (
  <Box component="section">
    <SectionHeading
      Icon={EnergySavingsLeafOutlined}
      title={ABOUT_SECTION_TITLES.platform}
    />
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 4,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
      }}
    >
      {PLATFORM_PILLARS.map((pillar, index) => (
        <PlatformPillarCard
          key={pillar.step}
          pillar={pillar}
          isHighlighted={!!pillar.callout}
          showDivider={index < PLATFORM_PILLARS.length - 1}
        />
      ))}
    </Paper>
  </Box>
);
