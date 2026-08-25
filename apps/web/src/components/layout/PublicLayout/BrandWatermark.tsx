import { FC } from "react";
import { Box } from "@mui/material";
import { BRAND } from "@/config/brand";

interface Props {
  /** CSS width of the mark (e.g. `"min(820px, 54%)"`). */
  width: string;
  /** CSS right offset that bleeds the mark off the edge (e.g. `"-3%"`). */
  right: string;
}

/**
 * Decorative Huella de Carbono RD fingerprint bleeding off the right edge of a
 * hero. Shared by the landing and the institutional page heros; the size and
 * bleed vary per surface.
 *
 * The opacity is deliberately low: the mark is line artwork over the brand
 * gradient, and anything brighter starts competing with the white copy that
 * runs across it.
 */
export const BrandWatermark: FC<Props> = ({ width, right }) => (
  <Box
    aria-hidden
    component="img"
    src={BRAND.markContrastSrc}
    alt=""
    sx={{
      position: "absolute",
      right,
      top: "50%",
      transform: "translateY(-50%)",
      width,
      height: "auto",
      opacity: 0.12,
      pointerEvents: "none",
      userSelect: "none",
    }}
  />
);
