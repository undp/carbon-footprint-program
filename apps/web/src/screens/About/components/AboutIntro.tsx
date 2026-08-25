import { FC } from "react";
import { Typography } from "@mui/material";
import { ABOUT_METHODOLOGY_PARAGRAPH } from "../constants";

/** How the platform does what the hero promises. */
export const AboutIntro: FC = () => (
  <Typography
    component="p"
    color="text.primary"
    sx={{
      fontSize: 17.5,
      lineHeight: 1.75,
      maxWidth: "76ch",
      mt: { xs: 4, md: 4.5 },
    }}
  >
    {ABOUT_METHODOLOGY_PARAGRAPH}
  </Typography>
);
