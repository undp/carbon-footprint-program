import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

interface UnaccreditedOrganizationDialogProps {
  open: boolean;
  onClose: () => void;
}

export const UnaccreditedOrganizationDialog: FC<
  UnaccreditedOrganizationDialogProps
> = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="unaccredited-organization-dialog-title"
      aria-describedby="unaccredited-organization-dialog-description"
    >
      <DialogTitle id="unaccredited-organization-dialog-title">
        Organización no acreditada
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="unaccredited-organization-dialog-description">
          No es posible enviar este inventario a cálculo porque la organización
          asociada aún no se encuentra acreditada. Por favor, complete el
          proceso de acreditación de la organización antes de continuar.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" autoFocus>
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
  );
};
