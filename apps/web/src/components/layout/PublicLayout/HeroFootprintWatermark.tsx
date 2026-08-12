import { FC } from "react";
import { useTheme } from "@mui/material";
import { LatamFootprintIcon } from "@/icons";

interface Props {
  /** CSS width of the icon (e.g. `"min(820px, 54%)"`). */
  width: string;
  /** CSS right offset that bleeds the icon off the edge (e.g. `"-3%"`). */
  right: string;
}

/**
 * Decorative Latam footprint bleeding off the right edge of a hero. Shared by
 * the landing and the institutional page heros; the size and bleed vary per
 * surface.
 */
export const HeroFootprintWatermark: FC<Props> = ({ width, right }) => {
  const theme = useTheme();

  return (
    <LatamFootprintIcon
      aria-hidden
      sx={{
        position: "absolute",
        right,
        top: "50%",
        transform: "translateY(-50%)",
        width,
        height: "auto",
        fill: theme.palette.common.white,
        opacity: 0.18,
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );
};
