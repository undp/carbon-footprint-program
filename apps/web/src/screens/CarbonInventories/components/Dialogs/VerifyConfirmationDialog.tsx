import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

interface VerifyConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const VerifyConfirmationDialog: FC<VerifyConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Enviar para Verificación</DialogTitle>
      <DialogContent>
        <DialogContentText>
          ¿Estás seguro de que deseas enviar esta huella de carbono para
          verificación? Una vez enviado, no podrás realizar más cambios hasta
          que el proceso de verificación se complete.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={onConfirm} color="primary" autoFocus>
          Enviar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
