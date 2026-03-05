import { FC } from "react";
import { Box, Button, Typography } from "@mui/material";

interface CarbonInventoriesHeaderProps {
  onNewInventory: () => void;
}

export const CarbonInventoryActions: FC<CarbonInventoriesHeaderProps> = ({
  onNewInventory,
}) => {
  return (
    <Box className="flex items-center justify-between">
      <Typography variant="h6" fontWeight={600}>
        Mis Huellas
      </Typography>
      <Box className="flex gap-2">
        <Button variant="contained" color="primary" onClick={onNewInventory}>
          Nueva Huella
        </Button>
      </Box>
    </Box>
  );
};
