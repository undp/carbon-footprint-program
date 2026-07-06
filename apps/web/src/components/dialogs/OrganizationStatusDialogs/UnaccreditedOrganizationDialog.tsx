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

interface UnaccreditedOrganizationDialogProps {
  open: boolean;
  onClose: () => void;
}

export const UnaccreditedOrganizationDialog: FC<
  UnaccreditedOrganizationDialogProps
> = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="unaccredited-organization-dialog-title"
      aria-describedby="unaccredited-organization-dialog-description"
    >
      <DialogTitle id="unaccredited-organization-dialog-title">
        {capitalize(VOCAB.organization.noun.singular)} no{" "}
        {VOCAB.inscription.adjective.singular}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="unaccredited-organization-dialog-description">
          No es posible continuar porque la {VOCAB.organization.noun.singular}{" "}
          asociada aún no se encuentra {VOCAB.inscription.adjective.singular}.
          Por favor, complete el proceso de {VOCAB.inscription.noun.singular} de
          la {VOCAB.organization.noun.singular} antes de continuar.
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
