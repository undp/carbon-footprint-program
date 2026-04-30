import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

export const IncompleteInventoryField = {
  NAME: "name",
  YEAR: "year",
  COMPLETED_LINES: "completed-lines",
} as const;

export type IncompleteInventoryField =
  (typeof IncompleteInventoryField)[keyof typeof IncompleteInventoryField];

const FIELD_LABELS: Record<IncompleteInventoryField, string> = {
  [IncompleteInventoryField.NAME]: "nombre",
  [IncompleteInventoryField.YEAR]: "año",
  [IncompleteInventoryField.COMPLETED_LINES]: "registros de emisión",
};

interface IncompleteInventoryDialogProps {
  open: boolean;
  onClose: () => void;
  missingFields: IncompleteInventoryField[];
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
          datos:{" "}
          <strong>
            {missingFields.map((field) => FIELD_LABELS[field]).join(", ")}
          </strong>
          . Por favor, edite la huella para completar esta información antes de
          continuar.
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
