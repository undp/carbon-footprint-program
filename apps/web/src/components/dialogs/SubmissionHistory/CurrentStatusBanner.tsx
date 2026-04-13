import { FC } from "react";
import { alpha, Box, Stack, Typography, useTheme } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { SubmissionStatus, SubmissionType } from "@repo/types";
import {
  getRequestStatusColor,
  REQUEST_STATUS_LABEL,
  REQUEST_TYPE_LABEL,
} from "@/utils/submissions";

type Props = {
  status: SubmissionStatus;
  type: SubmissionType;
};

export const CurrentStatusBanner: FC<Props> = ({ status, type }) => {
  const theme = useTheme();
  const statusColor = getRequestStatusColor(status, theme);

  return (
    <Box
      sx={{
        bgcolor: alpha(statusColor, 0.18),
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 3,
        py: 2,
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <InfoOutlined
          sx={{ color: statusColor, fontSize: 20, flexShrink: 0 }}
        />
        <Stack spacing={0}>
          <Typography
            variant="caption"
            fontWeight={500}
            sx={{ color: statusColor, opacity: 0.8, lineHeight: "16px" }}
          >
            Estado actual
          </Typography>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              color: statusColor,
              lineHeight: "28px",
              fontSize: 18,
              textTransform: "uppercase",
            }}
          >
            {REQUEST_STATUS_LABEL[status]}
          </Typography>
        </Stack>
      </Box>
      <Box>
        <Stack spacing={0}>
          <Typography
            variant="caption"
            fontWeight={500}
            sx={{ color: statusColor, opacity: 0.8, lineHeight: "16px" }}
          >
            Tipo de solicitud
          </Typography>
          <Typography
            variant="h6"
            fontWeight={600}
            sx={{
              color: statusColor,
              fontSize: 16,
            }}
          >
            {REQUEST_TYPE_LABEL[type]}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};
