import { FC, ReactNode } from "react";
import { Box, Card, Typography } from "@mui/material";

interface Props {
  label: string;
  icon: ReactNode;
  primaryValue: number;
  secondaryValue: number;
  subtitle: string;
  backgroundColor: string;
}

export const KpiCard: FC<Props> = ({
  label,
  icon,
  primaryValue,
  secondaryValue,
  subtitle,
  backgroundColor,
}) => {
  return (
    <Card
      sx={{
        width: 300,
        height: 163,
        borderRadius: "12px",
        boxShadow: "0px 2px 8px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        px: 2.5,
        py: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "8px",
            backgroundColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "inherit",
          }}
        >
          {icon}
        </Box>
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          {label}
        </Typography>
      </Box>

      <Typography variant="h4" fontWeight={700} sx={{ fontSize: 32, mb: 0.5 }}>
        {primaryValue.toLocaleString("es-CL")}{" "}
        <Box component="span" sx={{ color: "text.secondary" }}>
          |
        </Box>{" "}
        {secondaryValue.toLocaleString("es-CL")}
      </Typography>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: 12 }}
      >
        {subtitle}
      </Typography>
    </Card>
  );
};
