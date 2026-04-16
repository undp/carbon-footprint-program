import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { RecognitionTypeCards } from "./RecognitionTypeCards";

interface RecognitionsSummaryCardProps {
  year?: number;
}

export const RecognitionsSummaryCard: FC<RecognitionsSummaryCardProps> = ({
  year,
}) => (
  <Box>
    <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
      Reconocimientos Otorgados
    </Typography>
    <RecognitionTypeCards year={year} />
  </Box>
);
