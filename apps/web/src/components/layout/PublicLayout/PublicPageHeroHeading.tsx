import { FC } from "react";
import { alpha, Typography, useTheme } from "@mui/material";

interface Props {
  title: string;
  lead: string;
}

/**
 * Title + lead of a public institutional hero ("Material complementario" and
 * "Agradecimientos"). "Sobre la iniciativa" keeps its own larger scale, so it
 * doesn't use this component.
 */
export const PublicPageHeroHeading: FC<Props> = ({ title, lead }) => {
  const theme = useTheme();

  return (
    <>
      <Typography
        variant="h2"
        component="h1"
        color={theme.palette.common.white}
        sx={{
          fontWeight: "fontWeightBold",
          fontSize: { xs: "2.375rem", md: "3rem", lg: "3.625rem" },
          letterSpacing: "-1.4px",
          lineHeight: 1.05,
          mb: 2.25,
        }}
      >
        {title}
      </Typography>
      <Typography
        component="p"
        fontWeight="fontWeightLight"
        color={alpha(theme.palette.common.white, 0.94)}
        sx={{ fontSize: 17, lineHeight: 1.7, maxWidth: 820 }}
      >
        {lead}
      </Typography>
    </>
  );
};
