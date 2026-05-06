import { FC } from "react";
import { Box, Chip, Paper, Stack, Typography, useTheme } from "@mui/material";
import { CalendarTodayOutlined } from "@mui/icons-material";
import { type SubmissionHistoryEntry } from "@repo/types";
import { formatter } from "@/utils/formatting";
import { FilesSection } from "./FilesSection";
import { getEventLabel, REQUEST_TYPE_LABEL } from "../../../utils/submissions";
import { SubmissionCommentsSection } from "./SubmissionCommentsSection";
import { SubmissionTypeChip } from "@components/SubmissionTypeChip";

type Props = {
  history: SubmissionHistoryEntry[];
};

export const HistoryCard: FC<{
  entry: SubmissionHistoryEntry;
}> = ({ entry }) => {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: "10px",
        borderColor: theme.palette.background.default,
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack spacing={0.5}>
          {/* Event type + date */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box className="flex w-full flex-row items-center justify-between">
              <Box className="flex items-center gap-1.5">
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{
                    color: theme.palette.text.primary,
                    fontSize: 14,
                    lineHeight: "20px",
                    letterSpacing: "-0.15px",
                  }}
                >
                  {getEventLabel(entry)}
                </Typography>
                <Chip
                  label={formatter.dateTime(entry.date)}
                  size="small"
                  sx={{
                    bgcolor: theme.palette.background.default,
                    color: theme.palette.text.secondary,
                    border: `1px solid ${theme.palette.divider}`,
                    fontSize: 12,
                    height: 20,
                    borderRadius: "40px",
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
              </Box>
              {entry.submissionType && (
                <SubmissionTypeChip
                  label={REQUEST_TYPE_LABEL[entry.submissionType]}
                  color={theme.palette.requestTypeColors[entry.submissionType]}
                />
              )}
            </Box>
          </Stack>

          {/* User line */}
          {entry.userName && (
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: 12,
                lineHeight: "16px",
              }}
            >
              {entry.userName}
              {entry.userMetadata ? ` - ${entry.userMetadata}` : ""}
            </Typography>
          )}
        </Stack>

        {/* Comments */}
        {entry.comment && <SubmissionCommentsSection comment={entry.comment} />}

        {entry.files.length > 0 && (
          <FilesSection files={entry.files} sx={{ mt: 1.5 }} />
        )}
        {entry.recognitions.length > 0 && (
          <FilesSection
            files={entry.recognitions}
            sx={{ mt: 1.5 }}
            variant="recognitions"
          />
        )}
      </Box>
    </Paper>
  );
};

export const SubmissionHistorySection: FC<Props> = ({ history }) => {
  const theme = useTheme();
  if (history.length === 0) return null;

  return (
    <Box
      sx={{
        bgcolor: theme.palette.background.default,
        borderRadius: "10px",
        p: 2,
      }}
    >
      <Stack spacing={2}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <CalendarTodayOutlined
            sx={{ fontSize: 16, color: theme.palette.text.primary }}
          />
          <Typography
            variant="body2"
            fontWeight={500}
            sx={{
              color: theme.palette.text.primary,
              fontSize: 14,
              lineHeight: "20px",
              letterSpacing: "-0.15px",
            }}
          >
            Historial de Estados
          </Typography>
        </Stack>

        {/* History cards */}
        {history.map((entry, index) => (
          <HistoryCard
            key={`${index}-${entry.submissionId}-${entry.eventType}`}
            entry={entry}
          />
        ))}
      </Stack>
    </Box>
  );
};
