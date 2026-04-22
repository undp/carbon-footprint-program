import { FC } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { BadgeType } from "@repo/types";
import { useBadgeCatalog } from "@/api/query/badges/useBadgeCatalog";
import { BadgeCard } from "./BadgeCard";
import { BadgeCardSkeleton } from "./BadgeCardSkeleton";
import { BadgesScreenHeader } from "./BadgesScreenHeader";

const BADGE_TYPE_ORDER: BadgeType[] = [
  BadgeType.CARBON_INVENTORY_CALCULATION,
  BadgeType.CARBON_INVENTORY_VERIFICATION,
  BadgeType.REDUCTION_PROJECT_VERIFICATION,
  BadgeType.NEUTRALIZATION_PLAN_VERIFICATION,
  BadgeType.ORGANIZATION_ACCREDITATION,
];

export const BadgesScreen: FC = () => {
  const { data: catalog, isLoading, isError } = useBadgeCatalog();

  if (isLoading) {
    return (
      <Box className="flex flex-col gap-6">
        <BadgesScreenHeader />
        <Grid container spacing={3}>
          {BADGE_TYPE_ORDER.map((type) => (
            <Grid key={type} size={{ xs: 12, sm: 6, lg: 4 }}>
              <BadgeCardSkeleton />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (isError || !catalog) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="error">
          Error al cargar los sellos. Intenta recargar la página.
        </Typography>
      </Box>
    );
  }

  const catalogByType = Object.fromEntries(catalog.map((e) => [e.type, e]));

  return (
    <Box className="flex flex-col gap-6">
      <BadgesScreenHeader />

      <Grid container spacing={3}>
        {BADGE_TYPE_ORDER.map((type) => {
          const entry = catalogByType[type];
          if (!entry) return null;
          return (
            <Grid key={type} size={{ xs: 12, sm: 6, lg: 4 }}>
              <BadgeCard entry={entry} />
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
