import { FC, useCallback } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { YearSelector } from "./YearSelector";

interface AdminDashboardHeaderProps {
  year?: number;
}

export const AdminDashboardHeader: FC<AdminDashboardHeaderProps> = ({
  year,
}) => {
  const navigate = useNavigate({ from: "/admin/dashboard" });

  const handleYearChange = useCallback(
    (selectedYear?: number) => {
      void navigate({
        search: selectedYear !== undefined ? { year: selectedYear } : {},
        replace: true,
      });
    },
    [navigate]
  );

  return (
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
        <YearSelector year={year} onYearChange={handleYearChange} />
      </Stack>
    </Card>
  );
};
