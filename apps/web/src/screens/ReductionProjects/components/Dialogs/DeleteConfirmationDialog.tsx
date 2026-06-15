import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const DeleteConfirmationDialog: FC<DeleteConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  isLoading,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="rp-delete-dialog-title"
      aria-describedby="rp-delete-dialog-description"
    >
      <DialogTitle id="rp-delete-dialog-title">
        Eliminar Proyecto de Reducción
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="rp-delete-dialog-description">
          ¿Estás seguro de que deseas eliminar este proyecto de reducción? Esta
          acción no se puede deshacer.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} color="error" disabled={isLoading}>
          Eliminar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
