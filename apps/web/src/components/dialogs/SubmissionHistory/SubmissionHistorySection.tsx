import { FC } from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { CalendarTodayOutlined, OpenInNewOutlined } from "@mui/icons-material";
import {
  SubmissionEventType,
  SubmissionType,
  type SubmissionHistoryEntry,
} from "@repo/types";
import { formatDateTime } from "@/utils/formatting";
import { FilesSection } from "./FilesSection";
import { getEventLabel } from "../../../utils/submissions";
import { SubmissionCommentsSection } from "./SubmissionCommentsSection";

type Props = {
  history: SubmissionHistoryEntry[];
  onNavigateToInventory?: (inventoryId: string) => void;
};

const HistoryCard: FC<{
  entry: SubmissionHistoryEntry;
  onNavigateToInventory?: (id: string) => void;
}> = ({ entry, onNavigateToInventory }) => {
  const theme = useTheme();
  const showInventoryLink =
    entry.eventType === SubmissionEventType.POSTULATION &&
    entry.carbonInventoryId &&
    (entry.submissionType === SubmissionType.CARBON_INVENTORY_CALCULATION ||
      entry.submissionType === SubmissionType.CARBON_INVENTORY_VERIFICATION);

  const hasFiles = entry.files.length > 0;

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
              label={formatDateTime(entry.date)}
              size="small"
              sx={{
                bgcolor: theme.palette.background.default,
                color: theme.palette.text.secondary,
                border: `1px solid ${theme.palette.divider}`,
                fontSize: 12,
                height: 20,
                borderRadius: "9999px",
                "& .MuiChip-label": { px: 1 },
              }}
            />
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

        {/* Inventory link */}
        {showInventoryLink && onNavigateToInventory && (
          <Button
            variant="text"
            size="small"
            startIcon={
              <OpenInNewOutlined sx={{ fontSize: "12px !important" }} />
            }
            onClick={() => onNavigateToInventory(entry.carbonInventoryId!)}
            sx={{
              color: "glossyTeal.main",
              px: 1,
              fontSize: 12,
              fontWeight: 500,
              textTransform: "none",
              mt: 1,
              mb: 1,
              minWidth: 0,
            }}
          >
            Ver resumen del cálculo de huella
          </Button>
        )}

        {/* Comments */}
        {entry.comment && <SubmissionCommentsSection comment={entry.comment} />}

        {/* Files */}
        {hasFiles && (
          <Box sx={{ mt: 1.5 }}>
            <FilesSection files={entry.files} />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export const SubmissionHistorySection: FC<Props> = ({
  history,
  onNavigateToInventory,
}) => {
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
            onNavigateToInventory={onNavigateToInventory}
          />
        ))}
      </Stack>
    </Box>
  );
};
