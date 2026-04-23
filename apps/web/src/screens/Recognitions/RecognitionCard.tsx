import { FC } from "react";
import { alpha, Avatar, Box, Typography, useTheme } from "@mui/material";
import {
  GetBadgePreviewsResponse,
  CarbonInventoryRecognitionsType,
} from "@repo/types";
import {
  SUBMISSION_CARD_LABELS,
  SUBMISSION_LETTER,
  SUBMISSION_TYPE_TO_BADGE_TYPE,
} from "./constants";

interface RecognitionCardProps {
  submissionType: CarbonInventoryRecognitionsType;
  badgePreviews: GetBadgePreviewsResponse;
  count: number;
}

export const RecognitionCard: FC<RecognitionCardProps> = ({
  submissionType,
  badgePreviews,
  count,
}) => {
  const theme = useTheme();
  const previewUrl = badgePreviews.find(
    (p) => p.badgeType === SUBMISSION_TYPE_TO_BADGE_TYPE[submissionType]
  )?.previewUrl;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 2.5,
        py: 2,
        borderRadius: 2,
        backgroundColor: alpha(
          theme.palette.recognitionTypeColors[submissionType],
          0.6
        ),
      }}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={SUBMISSION_CARD_LABELS[submissionType]}
          style={{
            width: 56,
            height: 56,
            objectFit: "contain",
            borderRadius: "50%",
            flexShrink: 0,
          }}
        />
      ) : (
        <Avatar
          sx={{
            width: 56,
            height: 56,
            flexShrink: 0,
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          {SUBMISSION_LETTER[submissionType]}
        </Avatar>
      )}
      <Box>
        <Typography variant="body2" color="text.secondary">
          {SUBMISSION_CARD_LABELS[submissionType]}
        </Typography>
        <Typography variant="h4" fontWeight={700} color="text.primary">
          {count > 0 ? count : "-"}
        </Typography>
      </Box>
    </Box>
  );
};
