import { FC } from "react";
import {
  FactoryOutlined,
  ForumOutlined,
  GroupsOutlined,
  PublicOutlined,
} from "@mui/icons-material";
import { Box } from "@mui/material";
import { HighlightStatCard } from "@/components";
import {
  RESEARCH_COUNTRIES_LABEL,
  RESEARCH_ORGANIZATIONS_LABEL,
  RESEARCH_SESSIONS_LABEL,
  RESEARCH_STATS_OVERLAP,
  TOTAL_PARTICIPANTS,
} from "../constants";

/** Cifras del proceso de investigación, montadas sobre el borde del hero. */
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
    <HighlightStatCard
      value={RESEARCH_SESSIONS_LABEL}
      label="sesiones de entrevistas y validación"
      WatermarkIcon={ForumOutlined}
    />
    <HighlightStatCard
      value={String(TOTAL_PARTICIPANTS)}
      label="personas participantes"
      WatermarkIcon={GroupsOutlined}
    />
    <HighlightStatCard
      value={RESEARCH_COUNTRIES_LABEL}
      label="países de la región"
      WatermarkIcon={PublicOutlined}
    />
    <HighlightStatCard
      value={RESEARCH_ORGANIZATIONS_LABEL}
      label="organizaciones involucradas"
      WatermarkIcon={FactoryOutlined}
    />
  </Box>
);
