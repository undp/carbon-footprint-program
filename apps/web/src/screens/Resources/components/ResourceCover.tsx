import { FC } from "react";
import { PlayArrowRounded } from "@mui/icons-material";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import { ResourceKind, type SupportingResource } from "../constants";

interface Props {
  resource: SupportingResource;
}

const COVER_WIDTH = 138;
const COVER_HEIGHT = 186;

/**
 * Resource cover: a publication cover or a course cover, depending on the
 * type. It is decorative; the accessible title lives in the card.
 */
export const ResourceCover: FC<Props> = ({ resource }) => {
  const theme = useTheme();

  const isCourse = resource.kind === ResourceKind.COURSE;
  const background = isCourse
    ? `linear-gradient(165deg, ${theme.palette.common.deepNavy} 0%, ${theme.palette.primary.light} 100%)`
    : `linear-gradient(165deg, ${theme.palette.info.dark} 0%, ${theme.palette.info.main} 100%)`;

  return (
    <Box
      aria-hidden
      className="flex shrink-0 flex-col justify-between"
      sx={{
        width: COVER_WIDTH,
        height: COVER_HEIGHT,
        borderRadius: 2,
        px: 1.75,
        py: 2,
        background,
        boxShadow: `0 8px 20px ${alpha(theme.palette.common.deepNavyDark, 0.25)}`,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: 8,
          fontWeight: "fontWeightBold",
          letterSpacing: "1.4px",
          textTransform: "uppercase",
          color: alpha(theme.palette.common.white, 0.85),
        }}
      >
        {resource.coverKicker}
      </Typography>

      {isCourse && (
        <Box
          className="flex items-center justify-center self-center rounded-full"
          sx={{
            width: 44,
            height: 44,
            backgroundColor: alpha(theme.palette.common.white, 0.18),
            border: `1.5px solid ${alpha(theme.palette.common.white, 0.6)}`,
          }}
        >
          <PlayArrowRounded
            sx={{ fontSize: 22, color: theme.palette.common.white }}
          />
        </Box>
      )}

      <Typography
        component="span"
        sx={{
          fontSize: 11.5,
          fontWeight: "fontWeightBold",
          lineHeight: 1.45,
          color: theme.palette.common.white,
        }}
      >
        {resource.coverTitle}
      </Typography>

      {!isCourse && (
        <Box
          sx={{
            width: 46,
            height: 4,
            borderRadius: 1,
            backgroundColor: theme.palette.common.sunflower,
          }}
        />
      )}
    </Box>
  );
};
