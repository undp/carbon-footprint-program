import { ElementType, FC } from "react";
import { alpha, Box, Typography, useTheme, type BoxProps } from "@mui/material";
import { BRAND } from "@/config/brand";

interface Props {
  /** Height of the fingerprint mark, as a pixel number or any CSS length. */
  markHeight: number | string;
  /** Font size of the brand name, as a pixel number or any CSS length. */
  nameFontSize: number | string;
  /** Font size of the territory line, as a pixel number or any CSS length. */
  territoryFontSize: number | string;
  /** Space between the mark and the wordmark, in theme spacing units. */
  gap?: BoxProps["gap"];
  /**
   * Spells the territory out on a second line under the name. Turn it off on
   * surfaces too narrow for the full lockup (the sidebar), where the name
   * falls back to its clipped form.
   */
  showTerritory?: boolean;
  /** White artwork and white text, for a lockup over a dark surface. */
  contrast?: boolean;
  /** Element the lockup renders as (e.g. `"h1"` in the landing hero). */
  component?: ElementType;
}

/**
 * The platform's signature: the Huella de Carbono RD fingerprint next to the
 * wordmark. Shared by the public header, the landing hero, the sidebar and the
 * authentication screens, which differ only in size and in whether they sit on
 * a light or a dark surface.
 */
export const BrandLockup: FC<Props> = ({
  markHeight,
  nameFontSize,
  territoryFontSize,
  gap = 1.4,
  showTerritory = true,
  contrast = false,
  component = "div",
}) => {
  const theme = useTheme();

  const nameColor = contrast
    ? theme.palette.common.white
    : theme.palette.primary.main;
  const territoryColor = contrast
    ? alpha(theme.palette.common.white, 0.85)
    : theme.palette.text.secondary;

  return (
    <Box component={component} className="flex items-center" sx={{ gap, m: 0 }}>
      <Box
        component="img"
        src={contrast ? BRAND.markContrastSrc : BRAND.markSrc}
        alt=""
        sx={{ height: markHeight, width: "auto", display: "block" }}
      />
      <Box>
        <Typography
          component="span"
          sx={{
            display: "block",
            fontSize: nameFontSize,
            fontWeight: "fontWeightBold",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
            color: nameColor,
          }}
        >
          {showTerritory ? BRAND.wordmarkName : BRAND.shortName}
        </Typography>
        {showTerritory && (
          <Typography
            component="span"
            sx={{
              display: "block",
              mt: 0.4,
              fontSize: territoryFontSize,
              fontWeight: "fontWeightMedium",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              lineHeight: 1.3,
              color: territoryColor,
            }}
          >
            {BRAND.wordmarkTerritory}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
