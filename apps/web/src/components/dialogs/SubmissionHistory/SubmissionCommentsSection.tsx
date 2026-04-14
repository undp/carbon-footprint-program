import { FC } from "react";
import { Box, Stack, Typography, alpha, useTheme } from "@mui/material";
import { Circle, ModeCommentOutlined } from "@mui/icons-material";

type Props = {
  comment: string;
};

export const SubmissionCommentsSection: FC<Props> = ({ comment }) => {
  const theme = useTheme();
  const commentLines = comment
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[•*-]\s*/, ""));

  if (commentLines.length === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        bgcolor: alpha(theme.palette.warning.light, 0.12),
        border: `1px solid ${alpha(theme.palette.warning.light, 0.5)}`,
        borderRadius: "10px",
        my: 1.5,
        px: 1.5,
        py: 1.5,
      }}
    >
      <ModeCommentOutlined
        sx={{
          color: theme.palette.warning.dark,
          fontSize: 16,
          mt: "2px",
          flexShrink: 0,
        }}
      />

      <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
        {commentLines.map((line, index) => (
          <Box
            key={`${index}-${line}`}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 0.75,
            }}
          >
            <Circle
              sx={{
                color: theme.palette.text.primary,
                fontSize: 6,
                mt: 0.8,
                flexShrink: 0,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.primary,
                fontSize: 12,
                lineHeight: "19.5px",
                display: "block",
                wordBreak: "break-word",
              }}
            >
              {line}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};
