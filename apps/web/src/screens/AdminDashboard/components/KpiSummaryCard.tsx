import { FC } from "react";
import { Box, Card, Skeleton, Stack, Typography, alpha } from "@mui/material";
import { formatNumber } from "../constants";

interface KpiSummaryCardProps {
  title: string;
  color: string;
  Icon: React.ElementType;
  primaryValue: number | string;
  primaryLabel: string;
  secondaryValue: number | string;
  secondaryLabel: string;
  isLoading?: boolean;
  hasError?: boolean;
}

export const KpiSummaryCard: FC<KpiSummaryCardProps> = ({
  title,
  color,
  Icon,
  primaryValue,
  primaryLabel,
  secondaryValue,
  secondaryLabel,
  isLoading,
  hasError,
}) => {
  if (isLoading) {
    return (
      <Card
        sx={{
          flex: 1,
          p: 2,
          borderRadius: "12px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
          backgroundColor: alpha(color, 0.1),
        }}
      >
        <Stack spacing={1}>
          <Skeleton variant="text" width={120} height={20} />
          <Skeleton variant="text" width={80} height={40} />
          <Skeleton variant="text" width={100} height={20} />
        </Stack>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card
        sx={{
          flex: 1,
          p: 2,
          borderRadius: "12px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
          backgroundColor: alpha(color, 0.1),
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
          Error al cargar datos
        </Typography>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        flex: 1,
        p: 2,
        borderRadius: "12px",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        backgroundColor: alpha(color, 0.1),
      }}
    >
      <Box className="flex w-full items-start justify-between">
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Box
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          sx={{ backgroundColor: alpha(color, 0.2), color }}
        >
          <Icon />
        </Box>
      </Box>
      <Box sx={{ mt: 1 }}>
        <Stack direction="row" alignItems="baseline" spacing={0.5}>
          <Typography variant="h5" fontWeight={700}>
            {typeof primaryValue === "number"
              ? formatNumber(primaryValue)
              : primaryValue}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {primaryLabel}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            |
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {typeof secondaryValue === "number"
              ? formatNumber(secondaryValue)
              : secondaryValue}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {secondaryLabel}
          </Typography>
        </Stack>
      </Box>
    </Card>
  );
};
