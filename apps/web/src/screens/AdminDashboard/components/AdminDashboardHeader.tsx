import { FC } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";
import { YearSelector } from "./YearSelector";

interface AdminDashboardHeaderProps {
  year?: number;
  onYearChange: (year?: number) => void;
}

export const AdminDashboardHeader: FC<AdminDashboardHeaderProps> = ({
  year,
  onYearChange,
}) => (
  <Card
    sx={{
      p: 2,
      borderRadius: "16px",
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Dashboard General
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Resumen general de la plataforma
        </Typography>
      </Box>
      <YearSelector year={year} onYearChange={onYearChange} />
    </Stack>
  </Card>
);
