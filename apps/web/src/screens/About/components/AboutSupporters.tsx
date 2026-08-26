import { FC } from "react";
import { Box } from "@mui/material";
import { SectionHeading } from "@/components";
import { ABOUT_SECTION_TITLES, ABOUT_SUPPORTERS } from "../constants";
import { AboutSupporterCard } from "./AboutSupporterCard";

/** "Con el apoyo de": who funds and who drives the initiative. */
export const AboutSupporters: FC = () => (
  <Box component="section">
    <SectionHeading title={ABOUT_SECTION_TITLES.supporters} />
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
        gap: { xs: 4, md: 5 },
      }}
    >
      {ABOUT_SUPPORTERS.map((supporter) => (
        <AboutSupporterCard key={supporter.partnerId} supporter={supporter} />
      ))}
    </Box>
  </Box>
);
