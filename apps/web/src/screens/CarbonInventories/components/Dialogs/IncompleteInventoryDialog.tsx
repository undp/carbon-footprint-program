import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

interface IncompleteInventoryDialogProps {
  open: boolean;
  onClose: () => void;
  missingFields: string[];
}

export const IncompleteInventoryDialog: FC<IncompleteInventoryDialogProps> = ({
  open,
  onClose,
  missingFields,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="incomplete-inventory-dialog-title"
      aria-describedby="incomplete-inventory-dialog-description"
    >
      <DialogTitle id="incomplete-inventory-dialog-title">
        Huella incompleta
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="incomplete-inventory-dialog-description">
          No es posible enviar esta huella porque le faltan los siguientes
          datos: <strong>{missingFields.join(", ")}</strong>. Por favor, edite
          la huella para completar esta información antes de continuar.
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
