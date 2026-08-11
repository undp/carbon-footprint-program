import { FC } from "react";
import { Box } from "@mui/material";
import { PublicPageHero, PublicPageLayout } from "@/components/layout";
import { SUPPORTING_RESOURCES } from "./constants";
import { ResourceCard } from "./components/ResourceCard";
import { ResourcesHero } from "./components/ResourcesHero";

export const ResourcesScreen: FC = () => (
  <PublicPageLayout
    hero={
      <PublicPageHero>
        <ResourcesHero />
      </PublicPageHero>
    }
  >
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))",
        gap: 3,
        mt: { xs: 4, md: 4.5, lg: 4 },
      }}
    >
      {SUPPORTING_RESOURCES.map((resource) => (
        <ResourceCard key={resource.href} resource={resource} />
      ))}
    </Box>
  </PublicPageLayout>
);
