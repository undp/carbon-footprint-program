import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

interface IncompleteProjectDialogProps {
  open: boolean;
  onClose: () => void;
  missingFields: string[];
}

export const IncompleteProjectDialog: FC<IncompleteProjectDialogProps> = ({
  open,
  onClose,
  missingFields,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="incomplete-rp-dialog-title"
      aria-describedby="incomplete-rp-dialog-description"
    >
      <DialogTitle id="incomplete-rp-dialog-title">
        Proyecto incompleto
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="incomplete-rp-dialog-description">
          No es posible enviar este proyecto porque le faltan los siguientes
          datos: <strong>{missingFields.join(", ")}</strong>. Por favor, edite
          el proyecto para completar esta información antes de continuar.
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
