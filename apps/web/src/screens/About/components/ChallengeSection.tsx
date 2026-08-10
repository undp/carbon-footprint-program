import { FC } from "react";
import { FlagOutlined } from "@mui/icons-material";
import { Box } from "@mui/material";
import { SectionHeading } from "@/components";
import { ABOUT_SECTION_TITLES } from "../constants";
import { PrivateSectorCard } from "./PrivateSectorCard";
import { RegionalOpportunityCard } from "./RegionalOpportunityCard";
import { WarmingChartCard } from "./WarmingChartCard";

/** Sección "El desafío": por qué existe la plataforma. */
export const ChallengeSection: FC = () => (
  <Box component="section">
    <SectionHeading
      Icon={FlagOutlined}
      title={ABOUT_SECTION_TITLES.challenge}
    />
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "1.15fr 1fr 1fr" },
        gap: 2.5,
        alignItems: "stretch",
      }}
    >
      <WarmingChartCard />
      <PrivateSectorCard />
      <RegionalOpportunityCard />
    </Box>
  </Box>
);
