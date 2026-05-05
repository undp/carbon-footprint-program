import { FC } from "react";
import { Box, Card, Stack, Typography, alpha } from "@mui/material";
import { formatter } from "@/utils/formatting";

interface SubmissionStatusCardProps {
  label: string;
  color: string;
  Icon: React.ElementType;
  primary: number;
  primaryLabel?: string;
  secondary?: number;
  secondaryLabel?: string;
}

export const SubmissionStatusCard: FC<SubmissionStatusCardProps> = ({
  label,
  color,
  Icon,
  primary,
  primaryLabel,
  secondary,
  secondaryLabel,
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
      backgroundColor: alpha(color, 0.08),
    }}
  >
    <Box className="flex w-full justify-between">
      <Typography variant="body2" color="text.primary">
        {label}
      </Typography>
      <Box
        className="flex h-8 w-8 items-center justify-center rounded-lg"
        sx={{ backgroundColor: alpha(color, 0.15), color }}
      >
        <Icon fontSize="small" />
      </Box>
    </Box>
    {secondary !== undefined ? (
      <Stack direction="column" alignItems="baseline" spacing={0.5}>
        <Typography variant="h4" fontWeight={700}>
          {formatter.quantity(primary)} | {formatter.quantity(secondary)}
        </Typography>
        <Typography variant="caption" color="text.primary">
          {primaryLabel} | {secondaryLabel}
        </Typography>
      </Stack>
    ) : (
      <Typography variant="h4" fontWeight={700}>
        {formatter.quantity(primary)}
      </Typography>
    )}
  </Card>
);
