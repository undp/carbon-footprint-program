import { FC } from "react";
import { alpha, Box, Typography, useTheme, type Theme } from "@mui/material";
import { SubmissionStatus as RequestStatus } from "@repo/types";

interface RequestStatusChipProps {
  status: RequestStatus;
}

const getStatusColor = (status: RequestStatus, theme: Theme): string => {
  const map: Record<RequestStatus, string> = {
    [RequestStatus.PENDING]: theme.palette.warning.light,
    [RequestStatus.APPROVED]: theme.palette.success.light,
    [RequestStatus.REJECTED]: theme.palette.error.light,
  };
  return map[status];
};

const statusLabels: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: "Pendiente",
  [RequestStatus.APPROVED]: "Aprobada",
  [RequestStatus.REJECTED]: "Rechazada",
};

export const RequestStatusChip: FC<RequestStatusChipProps> = ({ status }) => {
  const theme = useTheme();
  const color = getStatusColor(status, theme);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        width: "fit-content",
        px: 1.5,
        minHeight: "32px",
        borderRadius: "6px",
        backgroundColor: alpha(color, 0.2),
        color,
      }}
    >
      <Typography variant="caption" fontWeight="fontWeightMedium">
        {statusLabels[status]}
      </Typography>
    </Box>
  );
};
