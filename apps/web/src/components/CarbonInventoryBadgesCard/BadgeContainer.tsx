import { Avatar, Box, Skeleton, Typography } from "@mui/material";
import { GetCarbonInventoryBadgesResponse, BadgeType } from "@repo/types";
import { FC } from "react";
import { EmptyStateMessage } from "../EmissionResults";

const subjectTypeToLabelMap: Record<BadgeType, string> = {
  CARBON_INVENTORY_CALCULATION: "Huella Latam - Medición",
  CARBON_INVENTORY_VERIFICATION: "Huella Latam - Verificación",
  ORGANIZATION_ACCREDITATION: "Huella Latam - Acreditación",
  REDUCTION_PLAN_VERIFICATION: "Huella Latam - Plan de Reducción",
  NEUTRALIZATION_PLAN_VERIFICATION: "Huella Latam - Plan de Neutralización",
};

interface BadgeRowProps {
  item: GetCarbonInventoryBadgesResponse[number];
}

const BadgeRow: FC<BadgeRowProps> = ({ item }) => {
  const { previewUrl, badgeType } = item;

  return (
    <>
      <Box className="h-px w-full" sx={{ bgcolor: "#D9D9D9" }} />
      <Box className="flex items-center gap-3 p-1">
        <Avatar
          src={previewUrl}
          alt={subjectTypeToLabelMap[badgeType]}
          sx={{ width: 32, height: 32, flexShrink: 0, boxShadow: 1 }}
        >
          <Skeleton variant="circular" width={32} height={32} />
        </Avatar>
        <Box className="flex flex-col">
          <Typography fontSize="0.875rem" color="text.primary">
            {subjectTypeToLabelMap[badgeType]}
          </Typography>
        </Box>
      </Box>
    </>
  );
};

interface BadgeContainerProps {
  isLoading: boolean;
  badges: GetCarbonInventoryBadgesResponse;
}

export const BadgeContainer: FC<BadgeContainerProps> = ({
  badges,
  isLoading,
}) => {
  if (badges.length === 0 && !isLoading)
    return (
      <Box className="border-grey-300 flex h-full min-h-0 w-full flex-col gap-4 rounded-xl border bg-white p-4">
        <Typography
          fontSize="1rem"
          fontWeight={600}
          color="text.primary"
          className="shrink-0"
        >
          Reconocimientos
        </Typography>

        <EmptyStateMessage
          message={"No hay reconocimientos asociados a esta huella de carbono."}
        />
      </Box>
    );

  return (
    <Box className="border-grey-300 flex h-full min-h-0 w-full flex-col gap-4 rounded-xl border bg-white p-4">
      <Typography
        fontSize="1rem"
        fontWeight={600}
        color="text.primary"
        className="shrink-0"
      >
        Reconocimientos
      </Typography>

      <Box className="flex flex-col">
        {isLoading
          ? [1, 2, 3].map((i) => (
              <Box key={i} className="flex items-center gap-3 p-1">
                <Skeleton
                  variant="circular"
                  width={32}
                  height={32}
                  className="shrink-0"
                />
                <Box className="flex flex-col">
                  <Skeleton variant="rectangular" width={300} height={20} />
                </Box>
              </Box>
            ))
          : badges.map((badge, i) => (
              <>
                <BadgeRow key={`${badge.badgeType}-${i}`} item={badge} />
                <Box className="h-px w-full" sx={{ bgcolor: "#D9D9D9" }} />
              </>
            ))}
      </Box>
    </Box>
  );
};
