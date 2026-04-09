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
import { capitalize } from "lodash-es";

interface MissingOrganizationDialogProps {
  open: boolean;
  onClose: () => void;
}

export const MissingOrganizationDialog: FC<MissingOrganizationDialogProps> = ({
  open,
  onClose,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="missing-organization-dialog-title"
      aria-describedby="missing-organization-dialog-description"
    >
      <DialogTitle id="missing-organization-dialog-title">
        {capitalize(VOCAB.organization.noun.singular)} no asociada
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="missing-organization-dialog-description">
          No es posible enviar esta huella a cálculo porque no tiene una{" "}
          {VOCAB.organization.noun.singular}{" "}
          {VOCAB.inscription.adjective.singular} asociada. Por favor, asocie una{" "}
          {VOCAB.organization.noun.singular} antes de continuar.
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
