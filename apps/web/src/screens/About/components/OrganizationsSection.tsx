import { FC } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { ABOUT_SECTION_TITLES, ORGANIZATION_PROFILES } from "../constants";
import { OrganizationProfileCard } from "./OrganizationProfileCard";

/** Sección "Quiénes están detrás": las instituciones tras la plataforma. */
export const OrganizationsSection: FC = () => {
  const theme = useTheme();

  return (
    <Box component="section">
      <Typography
        variant="subtitle1"
        component="h2"
        color="text.secondary"
        sx={{
          fontSize: 16,
          fontWeight: "fontWeightBold",
          letterSpacing: "1.4px",
          textTransform: "uppercase",
          mb: 2.5,
        }}
      >
        {ABOUT_SECTION_TITLES.organizations}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
          gap: 2.5,
          color: theme.palette.text.primary,
        }}
      >
        {ORGANIZATION_PROFILES.map((profile) => (
          <OrganizationProfileCard key={profile.title} profile={profile} />
        ))}
      </Box>
    </Box>
  );
};
