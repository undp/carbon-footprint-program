import { FC } from "react";
import { alpha, Box, Paper, Typography, useTheme } from "@mui/material";
import { PARTNERS } from "@/config/partners";
import type { AllianceActor } from "../constants";

interface Props {
  actor: AllianceActor;
}

/** Height reserved for the logo or icon, so all cards align. */
const EMBLEM_SLOT_HEIGHT = 60;

/** Card for an actor in the regional alliance. */
export const AllianceActorCard: FC<Props> = ({ actor }) => {
  const theme = useTheme();

  const partner = actor.partnerId ? PARTNERS[actor.partnerId] : undefined;
  const accentColor = partner?.brandColor ?? theme.palette.primary.main;

  const renderEmblem = () => {
    if (partner) {
      return (
        <Box
          component="img"
          src={partner.logoSrc}
          alt={partner.name}
          sx={{ maxHeight: 56, maxWidth: "100%", width: "auto" }}
        />
      );
    }

    if (!actor.Icon) return null;

    return (
      <Box
        className="flex h-14 w-14 items-center justify-center rounded-full"
        sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.12) }}
      >
        <actor.Icon sx={{ fontSize: 27, color: theme.palette.primary.dark }} />
      </Box>
    );
  };

  return (
    <Paper
      variant="outlined"
      className="flex flex-col gap-3"
      sx={{
        borderRadius: 3.5,
        borderTop: `4px solid ${accentColor}`,
        p: 2.75,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: 10.5,
          fontWeight: "fontWeightBold",
          letterSpacing: "1.4px",
          textTransform: "uppercase",
          color: accentColor,
        }}
      >
        {actor.role}
      </Typography>
      <Box className="flex items-center" sx={{ height: EMBLEM_SLOT_HEIGHT }}>
        {renderEmblem()}
      </Box>
      <Typography
        variant="subtitle1"
        component="h3"
        fontWeight="fontWeightBold"
        sx={{ fontSize: 16, color: theme.palette.common.deepForestDark }}
      >
        {actor.name}
      </Typography>
      <Typography
        variant="body2"
        color="text.primary"
        sx={{ fontSize: 13.5, lineHeight: 1.65 }}
      >
        {actor.description}
      </Typography>
    </Paper>
  );
};
