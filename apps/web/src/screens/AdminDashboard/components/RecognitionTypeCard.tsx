import { FC } from "react";
import { Card, Stack, Typography } from "@mui/material";
import { formatQuantity } from "@/utils/formatting";

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
      display: "flex",
      flexDirection: "column",
      gap: 1,
      flex: 1,
      p: 2,
      borderRadius: "12px",
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      backgroundColor: color,
    }}
  >
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
      {label}
    </Typography>
    {showPaired ? (
      <Stack direction="column" alignItems="baseline" spacing={0.5}>
        <Typography variant="h4" fontWeight={700}>
          {formatQuantity(approved)} | {formatQuantity(approvedAuto)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Manual | Automático
        </Typography>
      </Stack>
    ) : (
      <Typography variant="h4" fontWeight={700}>
        {formatQuantity(approved + approvedAuto)}
      </Typography>
    )}
  </Card>
);
