import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

interface DeleteReductionProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const DeleteReductionProjectDialog: FC<
  DeleteReductionProjectDialogProps
> = ({ open, onClose, onConfirm, isLoading }) => {
  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      aria-labelledby="delete-reduction-project-dialog-title"
      aria-describedby="delete-reduction-project-dialog-description"
    >
      <DialogTitle id="delete-reduction-project-dialog-title">
        Eliminar proyecto de reducción
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-reduction-project-dialog-description">
          ¿Estás seguro de que deseas eliminar este proyecto de reducción? Esta
          acción no se puede deshacer.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} color="error" loading={isLoading}>
          Eliminar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
