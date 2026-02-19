import { FC } from "react";
import { alpha, Box, Typography } from "@mui/material";
import { SubmissionStatus as RequestStatus } from "@repo/types";

interface RequestStatusChipProps {
  status: RequestStatus;
}

const statusColors: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: "#FFA726", // Orange
  [RequestStatus.APPROVED]: "#66BB6A", // Green
  [RequestStatus.REJECTED]: "#EF5350", // Red
};

const statusLabels: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: "Pendiente",
  [RequestStatus.APPROVED]: "Aprobada",
  [RequestStatus.REJECTED]: "Rechazada",
};

export const RequestStatusChip: FC<RequestStatusChipProps> = ({ status }) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        width: "fit-content",
        px: 1.5,
        minHeight: "32px",
        borderRadius: "6px",
        backgroundColor: alpha(statusColors[status], 0.2),
        color: statusColors[status],
      }}
    >
      <Typography variant="caption" fontWeight="fontWeightMedium">
        {statusLabels[status]}
      </Typography>
    </Box>
  );
};
