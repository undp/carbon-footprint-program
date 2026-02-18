import { FC } from "react";
import { alpha, Box } from "@mui/material";

export enum RequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  DRAFT = "DRAFT",
}

interface RequestStatusChipProps {
  status: RequestStatus;
}

const statusColors: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: "#FFA726", // Orange
  [RequestStatus.APPROVED]: "#66BB6A", // Green
  [RequestStatus.REJECTED]: "#EF5350", // Red
  [RequestStatus.DRAFT]: "#616161", // Grey
};

const statusLabels: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: "Pendiente",
  [RequestStatus.APPROVED]: "Aprobada",
  [RequestStatus.REJECTED]: "Rechazada",
  [RequestStatus.DRAFT]: "Borrador",
};

export const RequestStatusChip: FC<RequestStatusChipProps> = ({ status }) => {
  return (
    <Box
      sx={{
        width: "fit-content",
        px: 1.5,
        py: 0.5,
        borderRadius: "6px",
        backgroundColor: alpha(statusColors[status], 0.2),
        color: statusColors[status],
        fontWeight: 500,
        fontSize: "0.875rem",
      }}
    >
      {statusLabels[status]}
    </Box>
  );
};
