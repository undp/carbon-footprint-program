import { FC } from "react";
import {
  Box,
  Card,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { WorkspacePremiumOutlined } from "@mui/icons-material";
import { BadgeType } from "@repo/types";
import { useBadgeCatalog } from "@/api/query/badges/useBadgeCatalog";
import { BadgeCard } from "./BadgeCard";

const BADGE_TYPE_ORDER: BadgeType[] = [
  BadgeType.ORGANIZATION_ACCREDITATION,
  BadgeType.CARBON_INVENTORY_CALCULATION,
  BadgeType.CARBON_INVENTORY_VERIFICATION,
  BadgeType.REDUCTION_PROJECT_VERIFICATION,
  BadgeType.NEUTRALIZATION_PLAN_VERIFICATION,
];

export const BadgesScreen: FC = () => {
  const { data: catalog, isLoading, isError } = useBadgeCatalog();

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !catalog) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="error">
          Error al cargar los badges. Intenta recargar la página.
        </Typography>
      </Box>
    );
  }

  const catalogByType = Object.fromEntries(catalog.map((e) => [e.type, e]));

  return (
    <Box className="flex flex-col gap-6">
      <Card
        sx={{
          p: 2,
          borderRadius: "16px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <WorkspacePremiumOutlined color="primary" />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Badges
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestión de badges por tipo de reconocimiento
            </Typography>
          </Box>
        </Stack>
      </Card>

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
