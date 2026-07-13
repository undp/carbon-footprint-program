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
import capitalize from "lodash-es/capitalize";

interface BlockedOrganizationDialogProps {
  open: boolean;
  onClose: () => void;
}

export const BlockedOrganizationDialog: FC<BlockedOrganizationDialogProps> = ({
  open,
  onClose,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="blocked-organization-dialog-title"
      aria-describedby="blocked-organization-dialog-description"
    >
      <DialogTitle id="blocked-organization-dialog-title">
        {capitalize(VOCAB.organization.noun.singular)} bloqueada
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="blocked-organization-dialog-description">
          No es posible continuar porque la {VOCAB.organization.noun.singular}{" "}
          asociada se encuentra bloqueada. Por favor, contacte al administrador
          para más información.
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
