import { FC } from "react";
import { alpha, Box } from "@mui/material";
import { RequestType } from "@/api/query/requests/useAdminRequests";

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
        width: "fit-content",
        px: 1.5,
        py: 0.5,
        borderRadius: "6px",
        borderColor: statusColors[type],
        backgroundColor: alpha(statusColors[type], 0.2),
        color: statusColors[type],
        fontWeight: 500,
        fontSize: "0.875rem",
      }}
    >
      {statusLabels[type]}
    </Box>
  );
};
