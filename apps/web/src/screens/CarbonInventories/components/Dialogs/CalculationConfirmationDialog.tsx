import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

interface CalculationConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CalculationConfirmationDialog: FC<
  CalculationConfirmationDialogProps
> = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="calculation-dialog-title"
      aria-describedby="calculation-dialog-description"
    >
      <DialogTitle id="calculation-dialog-title">
        Postular para Cálculo
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="calculation-dialog-description">
          ¿Estás seguro de que deseas postular esta huella de carbono para
          cálculo? Una vez enviado, no podrás realizar más cambios hasta que el
          proceso de cálculo se complete.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={onConfirm} color="primary" autoFocus>
          Postular
        </Button>
      </DialogActions>
    </Dialog>
  );
};
