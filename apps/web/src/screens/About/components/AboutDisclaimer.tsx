import { FC } from "react";
import { Typography, useTheme } from "@mui/material";
import { ABOUT_DISCLAIMER } from "../constants";

/** Nota de cierre sobre financiamiento y responsabilidad de los contenidos. */
export const AboutDisclaimer: FC = () => {
  const theme = useTheme();

  return (
    <Typography
      component="p"
      color="text.secondary"
      sx={{
        fontSize: 12.5,
        fontWeight: "fontWeightLight",
        fontStyle: "italic",
        lineHeight: 1.75,
        maxWidth: 900,
        borderTop: `1px solid ${theme.palette.divider}`,
        pt: 3,
      }}
    >
      {ABOUT_DISCLAIMER}
    </Typography>
  );
};
