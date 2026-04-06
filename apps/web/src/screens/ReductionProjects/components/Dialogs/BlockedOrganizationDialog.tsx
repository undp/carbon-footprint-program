import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

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
      aria-labelledby="blocked-org-rp-dialog-title"
      aria-describedby="blocked-org-rp-dialog-description"
    >
      <DialogTitle id="blocked-org-rp-dialog-title">
        Organización bloqueada
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="blocked-org-rp-dialog-description">
          No es posible enviar este proyecto porque la organización asociada se
          encuentra bloqueada. Por favor, contacte al administrador para más
          información.
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
