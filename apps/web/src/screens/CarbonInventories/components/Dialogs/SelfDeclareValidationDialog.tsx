import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { VOCAB } from "@/config/vocab";

export type SelfDeclareValidationReason =
  | "missing-organization"
  | "missing-year"
  | "missing-name"
  | "inventory-year-already-declared"
  | "organization-not-accredited"
  | null;

interface SelfDeclareValidationDialogProps {
  open: boolean;
  onClose: () => void;
  reason: SelfDeclareValidationReason;
}

const messages: Record<NonNullable<SelfDeclareValidationReason>, string> = {
  "missing-organization": `No es posible autodeclarar esta huella porque no tiene una ${VOCAB.organization.noun.singular} asociada. Por favor, asocie una ${VOCAB.organization.noun.singular} antes de continuar.`,
  "missing-name":
    "No es posible autodeclarar esta huella porque no tiene un nombre asignado. Por favor, edite la huella para completar esta información antes de continuar.",
  "missing-year":
    "No es posible autodeclarar esta huella porque no tiene un año asignado. Por favor, edite la huella para completar esta información antes de continuar.",
  "inventory-year-already-declared":
    "No es posible autodeclarar esta huella porque ya se ha autodeclarado una huella para este año. Por favor, seleccione un año diferente antes de continuar.",
  "organization-not-accredited":
    "No es posible autodeclarar esta huella porque la organización no está acreditada. Por favor, asegúrese de que la organización esté acreditada antes de continuar.",
};

export const SelfDeclareValidationDialog: FC<
  SelfDeclareValidationDialogProps
> = ({ open, onClose, reason }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="self-declare-validation-dialog-title"
      aria-describedby="self-declare-validation-dialog-description"
    >
      <DialogTitle id="self-declare-validation-dialog-title">
        No es posible autodeclarar
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="self-declare-validation-dialog-description">
          {reason && messages[reason]}
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
