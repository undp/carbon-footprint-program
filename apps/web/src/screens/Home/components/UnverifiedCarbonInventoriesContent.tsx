import { FC, useCallback } from "react";
import { Box, Button, Typography } from "@mui/material";
import { AddRounded } from "@mui/icons-material";
import { Routes } from "@/interfaces";

import { useNavigate } from "@tanstack/react-router";
import capitalize from "lodash-es/capitalize";
import { VOCAB } from "@/config/vocab";

export const UnverifiedCarbonInventoriesContent: FC = () => {
  const navigate = useNavigate();

  const onClick = useCallback(() => {
    void navigate({ to: Routes.CARBON_INVENTORIES });
  }, [navigate]);

  return (
    <Box className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg bg-white p-8">
      <Typography variant="h6" fontWeight={600} color="text.primary">
        No tienes huellas verificadas
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Postula a verificación alguna de tus huellas
      </Typography>
      <Button variant="contained" startIcon={<AddRounded />} onClick={onClick}>
        Ir a Huella {capitalize(VOCAB.organization.relationalAdjective)}
      </Button>
    </Box>
  );
};
