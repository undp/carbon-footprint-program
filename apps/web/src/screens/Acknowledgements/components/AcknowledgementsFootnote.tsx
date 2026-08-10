import { FC } from "react";
import { Typography, useTheme } from "@mui/material";
import { ACKNOWLEDGEMENTS_FOOTNOTE } from "../constants";

/** Nota al pie sobre el origen del listado y cómo pedir correcciones. */
export const AcknowledgementsFootnote: FC = () => {
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
      {ACKNOWLEDGEMENTS_FOOTNOTE}
    </Typography>
  );
};
