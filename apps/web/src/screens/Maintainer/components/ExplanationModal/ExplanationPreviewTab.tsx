import { FC } from "react";
import { Box } from "@mui/material";
import { ExplanationContent } from "@/components/ExplanationContent";

interface ExplanationPreviewTabProps {
  content: string;
}

export const ExplanationPreviewTab: FC<ExplanationPreviewTabProps> = ({
  content,
}) => (
  <Box
    sx={(theme) => ({
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 1,
      px: 2,
      py: 1.5,
      maxHeight: "60vh",
      overflowY: "auto",
      backgroundColor: theme.palette.background.paper,
    })}
  >
    <ExplanationContent content={content} />
  </Box>
);
