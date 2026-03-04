import { FC, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { AddRounded } from "@mui/icons-material";
import { NewInventoryDialog } from "@/components/dialogs";

export const NoneCarbonInventoriesSection: FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Box className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg bg-white p-8">
      <Typography variant="h6" fontWeight={600} color="text.primary">
        No tienes huellas
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Crea tu primera huella para comenzar a registrar tus emisiones de
        carbono.
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddRounded />}
        onClick={() => setIsDialogOpen(true)}
      >
        Crear huella
      </Button>
      <NewInventoryDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </Box>
  );
};
