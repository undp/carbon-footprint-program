import { FC } from "react";
import { Box, Card, Stack, Typography, alpha } from "@mui/material";
import { formatQuantity } from "@/utils/formatting";

interface RequestStatusCardProps {
  label: string;
  color: string;
  Icon: React.ElementType;
  primary: number;
  primaryLabel?: string;
  secondary?: number;
  secondaryLabel?: string;
}

export const RequestStatusCard: FC<RequestStatusCardProps> = ({
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
      flex: 1,
      p: 2,
      borderRadius: "12px",
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      backgroundColor: alpha(color, 0.08),
    }}
  >
    <Box className="flex w-full justify-between">
      <Typography variant="body2" color="text.secondary">
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
      <Box sx={{ mt: 1 }}>
        <Stack direction="row" alignItems="baseline" spacing={0.5}>
          <Typography variant="h5" fontWeight={700}>
            {formatQuantity(primary)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {primaryLabel}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            |
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {formatQuantity(secondary)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {secondaryLabel}
          </Typography>
        </Stack>
      </Box>
    ) : (
      <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
        {formatQuantity(primary)}
      </Typography>
    )}
  </Card>
);
