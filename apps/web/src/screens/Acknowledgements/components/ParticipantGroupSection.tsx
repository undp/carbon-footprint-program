import { FC } from "react";
import { Box } from "@mui/material";
import { SectionHeading } from "@/components";
import type { ParticipantGroup } from "../constants";
import { ParticipantCard } from "./ParticipantCard";

interface Props {
  group: ParticipantGroup;
}

/** Grupo de personas agradecidas, con su contador y su grilla de fichas. */
export const ParticipantGroupSection: FC<Props> = ({ group }) => (
  <Box component="section">
    <SectionHeading
      Icon={group.Icon}
      title={group.title}
      badge={`${group.participants.length} personas`}
    />
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))",
        gap: 1.5,
      }}
    >
      {group.participants.map((participant) => (
        <ParticipantCard
          key={`${participant.name}-${participant.organization}`}
          participant={participant}
          Icon={group.Icon}
        />
      ))}
    </Box>
  </Box>
);
