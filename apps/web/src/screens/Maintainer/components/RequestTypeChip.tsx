import { FC } from "react";
import { alpha, Box, Typography } from "@mui/material";
import { SubmissionSubjectType as RequestType } from "@repo/types";

interface RequestTypeChipProps {
  type: RequestType;
}

const statusColors: Record<RequestType, string> = {
  [RequestType.ORGANIZATION_ACREDITATION]: "#1565C0",
  [RequestType.CARBON_INVENTORY_CALCULATION]: "#1E8449",
  [RequestType.CARBON_INVENTORY_VERIFICATION]: "#4A4A4A",
  [RequestType.REDUCTION_PLAN_VERFICATION]: "#B8860B",
  [RequestType.NEUTRALIZATION_PLAN_VERFICATION]: "#117A65",
};

const statusLabels: Record<RequestType, string> = {
  [RequestType.ORGANIZATION_ACREDITATION]: "Acreditación",
  [RequestType.CARBON_INVENTORY_CALCULATION]: "Diploma Medición",
  [RequestType.CARBON_INVENTORY_VERIFICATION]: "Sello Verificación",
  [RequestType.REDUCTION_PLAN_VERFICATION]: "Sello Reducción",
  [RequestType.NEUTRALIZATION_PLAN_VERFICATION]: "Sello Neutralización",
};

export const RequestTypeChip: FC<RequestTypeChipProps> = ({ type }) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        width: "fit-content",
        px: 1.5,
        height: "24px",
        borderRadius: "6px",
        backgroundColor: alpha(statusColors[type], 0.2),
        color: statusColors[type],
      }}
    >
      <Typography variant="caption" fontWeight="fontWeightMedium">
        {statusLabels[type]}
      </Typography>
    </Box>
  );
};
