import { FC } from "react";
import { HandshakeOutlined } from "@mui/icons-material";
import { Box } from "@mui/material";
import { SectionHeading } from "@/components";
import { ABOUT_SECTION_TITLES, ALLIANCE_ACTORS } from "../constants";
import { AllianceActorCard } from "./AllianceActorCard";
import { AllianceBanner } from "./AllianceBanner";

/** "Una alianza regional" section: who funds, designs, operates and uses. */
export const AllianceSection: FC = () => (
  <Box component="section">
    <SectionHeading
      Icon={HandshakeOutlined}
      title={ABOUT_SECTION_TITLES.alliance}
    />
    <AllianceBanner />
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
        gap: 1.75,
      }}
    >
      {ALLIANCE_ACTORS.map((actor) => (
        <AllianceActorCard key={actor.name} actor={actor} />
      ))}
    </Box>
  </Box>
);
