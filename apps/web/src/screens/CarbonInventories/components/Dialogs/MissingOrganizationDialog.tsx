import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

interface MissingOrganizationDialogProps {
  open: boolean;
  onClose: () => void;
}

export const MissingOrganizationDialog: FC<MissingOrganizationDialogProps> = ({
  open,
  onClose,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="missing-organization-dialog-title"
      aria-describedby="missing-organization-dialog-description"
    >
      <DialogTitle id="missing-organization-dialog-title">
        Organización no asociada
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="missing-organization-dialog-description">
          No es posible enviar esta huella a cálculo porque no tiene una
          organización acreditada asociada. Por favor, asocie una organización
          antes de continuar.
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
