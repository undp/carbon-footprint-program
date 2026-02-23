import { FC } from "react";
import { Box, Button, Typography } from "@mui/material";

interface CarbonInventoriesHeaderProps {
  hasDraftInventory: boolean;
  onContinueDraft: () => void;
  onNewInventory: () => void;
}

export const CarbonInventoryActions: FC<CarbonInventoriesHeaderProps> = ({
  hasDraftInventory,
  onContinueDraft,
  onNewInventory,
}) => {
  return (
    <Box className="flex items-center justify-between">
      <Typography variant="h6" fontWeight={600}>
        Mis Huellas
      </Typography>
      <Box className="flex gap-2">
        {hasDraftInventory && (
          <Button variant="outlined" color="primary" onClick={onContinueDraft}>
            Continuar borrador
          </Button>
        )}
        <Button variant="contained" color="primary" onClick={onNewInventory}>
          Nueva Huella
        </Button>
      </Box>
    </Box>
  );
};
