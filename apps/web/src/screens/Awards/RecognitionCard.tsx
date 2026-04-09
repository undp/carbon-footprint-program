import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { EmojiEventsOutlined } from "@mui/icons-material";
import { GetBadgePreviewsResponse } from "@repo/types";
import {
  AwardSubmissionType,
  SUBMISSION_CARD_COLORS,
  SUBMISSION_LABELS,
  SUBMISSION_TYPE_TO_BADGE_TYPE,
} from "./constants";

interface RecognitionCardProps {
  submissionType: AwardSubmissionType;
  badgePreviews: GetBadgePreviewsResponse;
  count: number;
}

export const RecognitionCard: FC<RecognitionCardProps> = ({
  submissionType,
  badgePreviews,
  count,
}) => {
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
        backgroundColor: SUBMISSION_CARD_COLORS[submissionType],
      }}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={SUBMISSION_LABELS[submissionType]}
          style={{
            width: 56,
            height: 56,
            objectFit: "contain",
            borderRadius: "50%",
            flexShrink: 0,
          }}
        />
      ) : (
        <EmojiEventsOutlined
          sx={{ fontSize: 48, color: "text.disabled", flexShrink: 0 }}
        />
      )}
      <Box>
        <Typography variant="body2" color="text.secondary">
          {SUBMISSION_LABELS[submissionType]}
        </Typography>
        <Typography variant="h4" fontWeight={700} color="text.primary">
          {count > 0 ? count : "-"}
        </Typography>
      </Box>
    </Box>
  );
};
