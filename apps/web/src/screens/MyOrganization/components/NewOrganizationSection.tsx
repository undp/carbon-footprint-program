import { FC, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { OrganizationFormDialog } from "./Dialogs";
import { CreateOrganizationBody } from "../../../api/query/organizations/useCreateOrganization";

interface Props {
  handleOrganizationCreation: (data: CreateOrganizationBody) => void;
}

export const NewOrganizationSection: FC<Props> = ({
  handleOrganizationCreation,
}) => {
  const [openFormDialog, setOpenFormDialog] = useState(false);

  return (
    <Box className="flex h-[calc(100vh-48px)] items-center justify-center">
      <Box className="flex h-1/3 flex-col items-center justify-center gap-4 rounded-lg bg-white p-6">
        <Typography variant="h6" color="text">
          Aún no tienes organizaciones creadas.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Haz clic en el botón para crear tu primera organización y comenzar a
          gestionar tu perfil, sedes y usuarios.
        </Typography>

        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpenFormDialog(true)}
        >
          Crear Organización
        </Button>
      </Box>

      <OrganizationFormDialog
        open={openFormDialog}
        onClose={() => setOpenFormDialog(false)}
        onSubmit={handleOrganizationCreation}
        mode="create"
      />
    </Box>
  );
};
