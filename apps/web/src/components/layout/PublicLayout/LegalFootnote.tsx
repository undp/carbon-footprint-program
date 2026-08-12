import { FC } from "react";
import { Typography, useTheme } from "@mui/material";

interface Props {
  text: string;
}

/**
 * Small italic legal note that closes a public screen (the "Sobre la
 * iniciativa" disclaimer, the "Agradecimientos" footnote).
 */
export const LegalFootnote: FC<Props> = ({ text }) => {
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
      {text}
    </Typography>
  );
};
