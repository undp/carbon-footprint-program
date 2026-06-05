import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { BadgeType } from "@repo/types";
import { useBadgeCatalog } from "@/api/query/badges/useBadgeCatalog";
import { BadgeCard } from "./BadgeCard";
import { BadgeCardSkeleton } from "./BadgeCardSkeleton";
import { BadgesScreenHeader } from "./BadgesScreenHeader";

const BADGE_TYPE_ORDER: BadgeType[] = [
  BadgeType.CARBON_INVENTORY_CALCULATION,
  BadgeType.CARBON_INVENTORY_VERIFICATION,
  BadgeType.REDUCTION_PROJECT_VERIFICATION,
  // TODO: Re-enable BadgeType.NEUTRALIZATION_PLAN_VERIFICATION here once the admin
  // neutralization module is implemented.
  BadgeType.ORGANIZATION_ACCREDITATION,
];

const CARD_MIN_WIDTH = 540;
const CARD_MAX_WIDTH = 680;

const gridSx = {
  display: "grid",
  gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN_WIDTH}px, 1fr))`,
  justifyItems: "center",
  gap: 3,
  "& > *": { maxWidth: CARD_MAX_WIDTH, width: "100%" },
};

export const BadgesScreen: FC = () => {
  const { data: catalog, isLoading, isError } = useBadgeCatalog();

  if (isLoading) {
    return (
      <Box className="flex flex-col gap-6">
        <BadgesScreenHeader />
        <Box sx={gridSx}>
          {BADGE_TYPE_ORDER.map((type) => (
            <BadgeCardSkeleton key={type} />
          ))}
        </Box>
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

      <Box sx={gridSx}>
        {BADGE_TYPE_ORDER.map((type) => {
          const entry = catalogByType[type];
          if (!entry) return null;
          return <BadgeCard key={type} entry={entry} />;
        })}
      </Box>
    </Box>
  );
};
