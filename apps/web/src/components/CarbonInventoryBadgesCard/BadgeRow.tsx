import { FC } from "react";
import { Box, Avatar, Skeleton, Typography } from "@mui/material";
import { BadgeType, GetCarbonInventoryBadgesResponse } from "@repo/types";

const subjectTypeToLabelMap: Record<BadgeType, string> = {
  [BadgeType.CARBON_INVENTORY_CALCULATION]: "Huella Latam - Medición",
  [BadgeType.CARBON_INVENTORY_VERIFICATION]: "Huella Latam - Verificación",
  [BadgeType.ORGANIZATION_ACCREDITATION]: "Huella Latam - Acreditación",
  [BadgeType.REDUCTION_PROJECT_VERIFICATION]:
    "Huella Latam - Proyecto de reducción",
  [BadgeType.NEUTRALIZATION_PLAN_VERIFICATION]:
    "Huella Latam - Plan de Neutralización",
};

interface BadgeRowProps {
  item: GetCarbonInventoryBadgesResponse[number];
}

export const BadgeRow: FC<BadgeRowProps> = ({ item }) => {
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
