import { FC } from "react";
import { alpha, Box, Typography } from "@mui/material";
import { SubmissionSubjectType as RequestType } from "@repo/types";

interface RequestTypeChipProps {
  type: RequestType;
}

const typeColors: Record<RequestType, string> = {
  [RequestType.ORGANIZATION_ACCREDITATION]: "#1565C0",
  [RequestType.CARBON_INVENTORY_CALCULATION]: "#1E8449",
  [RequestType.CARBON_INVENTORY_VERIFICATION]: "#4A4A4A",
  [RequestType.REDUCTION_PLAN_VERIFICATION]: "#B8860B",
  [RequestType.NEUTRALIZATION_PLAN_VERIFICATION]: "#117A65",
};

const typeLabels: Record<RequestType, string> = {
  [RequestType.ORGANIZATION_ACCREDITATION]: "Acreditación",
  [RequestType.CARBON_INVENTORY_CALCULATION]: "Diploma Medición",
  [RequestType.CARBON_INVENTORY_VERIFICATION]: "Sello Verificación",
  [RequestType.REDUCTION_PLAN_VERIFICATION]: "Sello Reducción",
  [RequestType.NEUTRALIZATION_PLAN_VERIFICATION]: "Sello Neutralización",
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
        backgroundColor: alpha(typeColors[type], 0.2),
        color: typeColors[type],
      }}
    >
      <Typography variant="caption" fontWeight="fontWeightMedium">
        {typeLabels[type]}
      </Typography>
    </Box>
  );
};
