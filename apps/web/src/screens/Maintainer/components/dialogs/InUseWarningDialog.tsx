import { FC } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

export type ProfilingEntityLabel =
  | "rubro"
  | "subrubro"
  | "actividad principal"
  | "tamaño";

interface Props {
  open: boolean;
  entityLabel: ProfilingEntityLabel;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog shown before saving a maintainer edit when:
 *   1. The edit changes a visible field (name, parent FK), AND
 *   2. The row has user-data references (`isInUse: true`).
 *
 * Description-only edits and edits on rows with no consumers should bypass this dialog
 * — never construct an `InUseWarningDialog` consumer that opens it unconditionally.
 */
export const InUseWarningDialog: FC<Props> = ({
  open,
  entityLabel,
  onCancel,
  onConfirm,
}) => (
  <Dialog open={open} onClose={onCancel}>
    <DialogTitle>Cambio sobre un {entityLabel} en uso</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Este {entityLabel} está siendo utilizado por organizaciones y huellas.
        Este cambio afectará a todos los usuarios que lo tengan seleccionado.
        ¿Deseas continuar?
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCancel}>
        Cancelar
      </Button>
      <Button onClick={onConfirm} variant="contained" color="primary">
        Continuar
      </Button>
    </DialogActions>
  </Dialog>
);
