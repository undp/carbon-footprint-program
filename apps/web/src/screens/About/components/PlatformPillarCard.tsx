import { FC } from "react";
import { alpha, Box, Chip, Typography, useTheme } from "@mui/material";
import type { PlatformPillar } from "../constants";

interface Props {
  pillar: PlatformPillar;
  /** The last pillar stands out with a gradient background and amber numbering. */
  isHighlighted: boolean;
  showDivider: boolean;
}

/** Column of the "Qué hace la plataforma" card. */
export const PlatformPillarCard: FC<Props> = ({
  pillar,
  isHighlighted,
  showDivider,
}) => {
  const theme = useTheme();

  const stepColor = isHighlighted
    ? theme.palette.common.sunflower
    : theme.palette.primary.main;
  const stepTextColor = isHighlighted
    ? theme.palette.common.deepNavyDark
    : theme.palette.common.white;

  return (
    <Box
      className="flex flex-col gap-3.5"
      sx={{
        px: 4.25,
        py: 4,
        borderRight: showDivider
          ? { xs: "none", md: `1px solid ${theme.palette.divider}` }
          : "none",
        borderBottom: showDivider
          ? { xs: `1px solid ${theme.palette.divider}`, md: "none" }
          : "none",
        background: isHighlighted
          ? `linear-gradient(160deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${theme.palette.common.white} 100%)`
          : theme.palette.common.white,
      }}
    >
      <Box className="flex items-center gap-3">
        <Chip
          label={pillar.step}
          size="small"
          sx={{
            borderRadius: 1.5,
            fontSize: 12,
            fontWeight: "fontWeightBold",
            letterSpacing: "1.4px",
            backgroundColor: stepColor,
            color: stepTextColor,
          }}
        />
        <Box
          aria-hidden
          sx={{
            flex: 1,
            height: 3,
            background: `linear-gradient(90deg, ${stepColor}, ${alpha(stepColor, 0.15)})`,
          }}
        />
      </Box>
      <pillar.Icon sx={{ fontSize: 30, color: theme.palette.primary.main }} />
      <Typography
        variant="h6"
        component="h3"
        fontWeight="fontWeightBold"
        sx={{ fontSize: 18, color: theme.palette.common.deepNavyDark }}
      >
        {pillar.title}
      </Typography>
      <Typography
        variant="body2"
        color="text.primary"
        sx={{ fontSize: 14, lineHeight: 1.7 }}
      >
        {pillar.body}
      </Typography>

      {pillar.callout ? (
        <Box
          className="mt-auto"
          sx={{
            pt: 1.75,
          }}
        >
          <Box
            sx={{
              px: 1.75,
              py: 1.5,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.common.white,
            }}
          >
            <Typography
              component="span"
              sx={{
                fontSize: 13,
                fontWeight: "fontWeightMedium",
                lineHeight: 1.45,
                color: theme.palette.common.deepNavyDark,
              }}
            >
              {pillar.callout}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box className="mt-auto flex flex-wrap gap-2" sx={{ pt: 1.75 }}>
          {pillar.tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              variant="outlined"
              sx={{
                borderRadius: 1.5,
                fontSize: 11.5,
                fontWeight: "fontWeightMedium",
                color: theme.palette.primary.dark,
                backgroundColor: alpha(theme.palette.primary.main, 0.06),
                borderColor: alpha(theme.palette.primary.main, 0.18),
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
