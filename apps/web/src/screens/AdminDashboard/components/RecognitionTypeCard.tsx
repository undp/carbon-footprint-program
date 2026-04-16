import { FC } from "react";
import { Card, Stack, Typography, alpha } from "@mui/material";
import { formatNumber } from "../constants";

interface RecognitionTypeCardProps {
  label: string;
  approved: number;
  approvedAuto: number;
  color: string;
  showPaired?: boolean;
}

export const RecognitionTypeCard: FC<RecognitionTypeCardProps> = ({
  label,
  approved,
  approvedAuto,
  color,
  showPaired = false,
}) => (
  <Card
    sx={{
      flex: 1,
      p: 2,
      borderRadius: "12px",
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      backgroundColor: alpha(color, 0.08),
    }}
  >
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
      {label}
    </Typography>
    {showPaired ? (
      <Stack direction="row" alignItems="baseline" spacing={0.5}>
        <Typography variant="h5" fontWeight={700}>
          {formatNumber(approved)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Manual
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          |
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          {formatNumber(approvedAuto)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Automática
        </Typography>
      </Stack>
    ) : (
      <Typography variant="h4" fontWeight={700}>
        {formatNumber(approved + approvedAuto)}
      </Typography>
    )}
  </Card>
);
