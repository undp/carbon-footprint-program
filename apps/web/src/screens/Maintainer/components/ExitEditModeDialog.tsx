import { FC } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

interface Props {
  open: boolean;
  methodologyName: string;
  hasUnsavedRow: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ExitEditModeDialog: FC<Props> = ({
  open,
  methodologyName,
  hasUnsavedRow,
  onClose,
  onConfirm,
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Salir de modo edición</DialogTitle>
    <DialogContent>
      {hasUnsavedRow ? (
        <DialogContentText>
          Tienes cambios sin guardar en la fila que estás editando. Si sales del
          modo edición, los cambios se perderán.
        </DialogContentText>
      ) : (
        <DialogContentText>
          Estás a punto de salir del modo edición de{" "}
          <strong>{methodologyName}</strong>. Podrás volver a editarla desde la
          pantalla de Metodologías.
        </DialogContentText>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="outlined" color="primary" onClick={onConfirm}>
        {hasUnsavedRow ? "Salir sin guardar" : "Salir"}
      </Button>
    </DialogActions>
  </Dialog>
);
