import { FC } from "react";
import { alpha, Box } from "@mui/material";
import { RequestType } from "@/api/query/requests/useAdminRequests";

interface RequestTypeChipProps {
  type: RequestType;
}

const statusColors: Record<RequestType, string> = {
  [RequestType.ORG_ACREDITATION]: "#1565C0",
  [RequestType.CALCULATION_DIPLOMA]: "#1E8449",
  [RequestType.VERIFICATION_SEAL]: "#4A4A4A",
  [RequestType.REDUCTION_SEAL]: "#B8860B",
  [RequestType.NEUTRALIZATION_SEAL]: "#117A65",
};

const statusLabels: Record<RequestType, string> = {
  [RequestType.ORG_ACREDITATION]: "Acreditación",
  [RequestType.CALCULATION_DIPLOMA]: "Diploma Medición",
  [RequestType.VERIFICATION_SEAL]: "Sello Verificación",
  [RequestType.REDUCTION_SEAL]: "Sello Reducción",
  [RequestType.NEUTRALIZATION_SEAL]: "Sello Neutralización",
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
