import { FC } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import { ABOUT_FOUNDATION_NOTE } from "../constants";

/**
 * Closing note: the digital public good the platform is built on.
 *
 * It used to be fine print at the foot of the screen and went unread, so it is
 * now a framed block set in the brand navy at reading size.
 */
export const AboutFoundationNote: FC = () => {
  const theme = useTheme();

  return (
    <Box
      component="section"
      sx={{
        px: { xs: 3, md: 4 },
        py: { xs: 3, md: 3.5 },
        borderRadius: 3,
        borderLeft: `5px solid ${theme.palette.secondary.light}`,
        backgroundColor: alpha(theme.palette.primary.main, 0.05),
      }}
    >
      <Typography
        component="p"
        sx={{
          fontSize: 15.5,
          lineHeight: 1.7,
          fontWeight: "fontWeightMedium",
          color: theme.palette.primary.main,
        }}
      >
        {ABOUT_FOUNDATION_NOTE}
      </Typography>
    </Box>
  );
};
