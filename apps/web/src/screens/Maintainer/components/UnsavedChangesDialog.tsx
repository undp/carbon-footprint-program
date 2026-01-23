import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const UnsavedChangesDialog: FC<Props> = ({
  open,
  onCancel,
  onConfirm,
}) => (
  <Dialog open={open} onClose={onCancel}>
    <DialogTitle>Cambios sin guardar</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Tienes cambios pendientes que no se han guardado. ¿Deseas salir sin
        guardar?
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel}>Cancelar</Button>
      <Button onClick={onConfirm} color="error" variant="contained">
        Salir sin guardar
      </Button>
    </DialogActions>
  </Dialog>
);
