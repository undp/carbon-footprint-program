import { FC } from "react";
import { alpha, Box, Paper, Typography, useTheme } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import type { Participant } from "../participants";

interface Props {
  participant: Participant;
  Icon: SvgIconComponent;
}

/** Card for an acknowledged person: name and organization. */
export const ParticipantCard: FC<Props> = ({ participant, Icon }) => {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      className="flex items-center gap-3.5"
      sx={{
        borderRadius: 2.5,
        px: 2,
        py: 1.625,
        transition: theme.transitions.create("border-color"),
        "&:hover": {
          borderColor: alpha(theme.palette.primary.main, 0.35),
        },
      }}
    >
      <Box
        className="flex shrink-0 items-center justify-center rounded-full"
        sx={{
          width: 32,
          height: 32,
          backgroundColor: alpha(theme.palette.primary.main, 0.12),
        }}
      >
        <Icon sx={{ fontSize: 16, color: theme.palette.primary.dark }} />
      </Box>
      <Box>
        <Typography
          component="b"
          sx={{
            display: "block",
            fontSize: 14.5,
            fontWeight: "fontWeightMedium",
            lineHeight: 1.35,
            color: theme.palette.common.deepNavyDark,
          }}
        >
          {participant.name}
        </Typography>
        <Typography
          component="span"
          color="text.primary"
          sx={{ fontSize: 12.5, lineHeight: 1.4 }}
        >
          {participant.organization}
        </Typography>
      </Box>
    </Paper>
  );
};
