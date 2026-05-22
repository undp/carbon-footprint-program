import { FC } from "react";
import { alpha, Box, Stack, Typography, useTheme } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import {
  SubmissionEventType,
  SubmissionStatus,
  SubmissionType,
} from "@repo/types";
import { EVENT_TYPE_LABEL } from "@/utils/submissions";
import { SUBMISSION_STATUS_CONFIG } from "@/labels/status/submission";
import { SUBMISSION_TYPE_LABELS } from "@/labels/status/submissionType";

type Props = {
  status: SubmissionStatus | null;
  submissionType: SubmissionType | null;
  eventType: SubmissionEventType;
};

export const CurrentStatusBanner: FC<Props> = ({
  status,
  submissionType,
  eventType,
}) => {
  const theme = useTheme();
  const statusColor = status
    ? theme.palette.statusFamilyColors[SUBMISSION_STATUS_CONFIG[status].family]
    : theme.palette.text.secondary;

  return (
    <Box
      sx={{
        bgcolor: statusColor ? alpha(statusColor, 0.18) : undefined,
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
            {status
              ? SUBMISSION_STATUS_CONFIG[status].label
              : EVENT_TYPE_LABEL[eventType]}
          </Typography>
        </Stack>
      </Box>
      {submissionType && (
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
              {SUBMISSION_TYPE_LABELS[submissionType].label}
            </Typography>
          </Stack>
        </Box>
      )}
    </Box>
  );
};
