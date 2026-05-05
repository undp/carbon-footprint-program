import { FC } from "react";
import { Avatar, Box, Card, Stack, Typography } from "@mui/material";
import { formatter } from "@/utils/formatting";

interface RecognitionTypeCardProps {
  label: string;
  approved: number;
  approvedAuto: number;
  backgroundColor: string;
  showPaired?: boolean;
  previewUrl?: string;
  fallbackLetter?: string;
}

export const RecognitionTypeCard: FC<RecognitionTypeCardProps> = ({
  label,
  approved,
  approvedAuto,
  backgroundColor,
  showPaired = false,
  previewUrl,
  fallbackLetter,
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
      backgroundColor,
      position: "relative",
    }}
  >
    {(previewUrl ?? fallbackLetter) && (
      <Box sx={{ position: "absolute", top: 12, right: 12 }}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={label}
            style={{
              width: 32,
              height: 32,
              objectFit: "contain",
              borderRadius: "50%",
            }}
          />
        ) : (
          <Avatar sx={{ width: 32, height: 32, fontSize: 14, fontWeight: 700 }}>
            {fallbackLetter}
          </Avatar>
        )}
      </Box>
    )}
    <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
      {label}
    </Typography>
    {showPaired ? (
      <Stack direction="column" alignItems="baseline" spacing={0.5}>
        <Typography variant="h4" fontWeight={700}>
          {formatter.quantity(approved)} | {formatter.quantity(approvedAuto)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Manual | Automático
        </Typography>
      </Stack>
    ) : (
      <Typography variant="h4" fontWeight={700}>
        {formatter.quantity(approved + approvedAuto)}
      </Typography>
    )}
  </Card>
);
