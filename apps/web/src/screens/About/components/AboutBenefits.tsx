import { FC } from "react";
import { EnergySavingsLeafOutlined } from "@mui/icons-material";
import { Box } from "@mui/material";
import { SectionHeading } from "@/components";
import { ABOUT_BENEFITS, ABOUT_SECTION_TITLES } from "../constants";
import { AboutBenefitCard } from "./AboutBenefitCard";

/** "Qué hace la plataforma": measure, report and act. */
export const AboutBenefits: FC = () => (
  <Box component="section">
    <SectionHeading
      Icon={EnergySavingsLeafOutlined}
      title={ABOUT_SECTION_TITLES.benefits}
    />
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
        gap: { xs: 4, md: 5 },
      }}
    >
      {ABOUT_BENEFITS.map((benefit) => (
        <AboutBenefitCard key={benefit.title} benefit={benefit} />
      ))}
    </Box>
  </Box>
);
