import { FC } from "react";
import { alpha, Box, Card, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";

interface RequestScreenKpiCardProps {
  label: string;
  color: string;
  Icon: SvgIconComponent;
  value: number;
}

export const RequestScreenKpiCard: FC<RequestScreenKpiCardProps> = ({
  label,
  color,
  Icon,
  value,
}) => (
  <Card
    sx={{
      minHeight: "130px",
      flex: 1,
      p: 2,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      borderRadius: "12px",
      backgroundColor: alpha(color, 0.1),
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
    }}
  >
    <Box className="flex w-full justify-between">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        sx={{
          backgroundColor: alpha(color, 0.1),
          color,
        }}
      >
        <Icon />
      </Box>
    </Box>
    <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
      {value}
    </Typography>
  </Card>
);
