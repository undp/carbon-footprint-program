import { FC, PropsWithChildren } from "react";
import { Box, useTheme } from "@mui/material";
import { brandGradient } from "@/utils/brandGradient";
import { BrandWatermark } from "./BrandWatermark";
import {
  HERO_OVERLAP_BREATHING_ROOM,
  PUBLIC_CONTENT_MAX_WIDTH,
} from "./constants";

interface Props {
  /**
   * Pixels that the following content rises into the hero (the pages whose
   * stat cards sit over its bottom edge). The bottom padding grows with this
   * value so the cards never cover the text.
   */
  overlappingContentOffset?: number;
}

/** Base bottom padding of the hero per breakpoint, in pixels. */
const BASE_BOTTOM_PADDING = { xs: 40, md: 52, lg: 60 };

/**
 * Heading of the public institutional screens: brand gradient with the
 * decorative footprint on the right and the page title on top.
 */
export const PublicPageHero: FC<PropsWithChildren<Props>> = ({
  overlappingContentOffset = 0,
  children,
}) => {
  const theme = useTheme();

  const clearance = overlappingContentOffset + HERO_OVERLAP_BREATHING_ROOM;
  const bottomPadding = {
    xs: `${Math.max(BASE_BOTTOM_PADDING.xs, clearance)}px`,
    md: `${Math.max(BASE_BOTTOM_PADDING.md, clearance)}px`,
    lg: `${Math.max(BASE_BOTTOM_PADDING.lg, clearance)}px`,
  };

  return (
    <Box
      component="section"
      sx={{
        position: "relative",
        overflow: "hidden",
        background: brandGradient(theme),
      }}
    >
      <BrandWatermark width="min(440px, 34%)" right="-2%" />
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          maxWidth: PUBLIC_CONTENT_MAX_WIDTH,
          mx: "auto",
          px: { xs: 2.5, md: 4, lg: 7 },
          pt: { xs: 5, md: 6.5, lg: 7.5 },
          pb: bottomPadding,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
