import { FC } from "react";
import { Box, Button, Typography } from "@mui/material";

interface OrganizationEmptyStateProps {
  onOpenFormDialog: () => void;
}

export const OrganizationEmptyState: FC<OrganizationEmptyStateProps> = ({
  onOpenFormDialog,
}) => {
  return (
    <Box className="flex flex-1 flex-col gap-6 p-6">
      <Box className="flex h-[calc(100vh-48px)] items-center justify-center">
        <Box className="flex h-1/3 flex-col items-center justify-center gap-4 rounded-lg bg-white p-6">
          <Typography variant="h6" color="text.primary">
            Aún no tienes organizaciones creadas.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Haz clic en el botón para crear tu primera organización y comenzar a
            gestionar tu perfil, sedes y usuarios.
          </Typography>

          <Button
            variant="contained"
            color="primary"
            onClick={onOpenFormDialog}
          >
            Crear Organización
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
