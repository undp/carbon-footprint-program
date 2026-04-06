import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

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
      aria-labelledby="missing-org-rp-dialog-title"
      aria-describedby="missing-org-rp-dialog-description"
    >
      <DialogTitle id="missing-org-rp-dialog-title">
        Organización no asociada
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="missing-org-rp-dialog-description">
          No es posible enviar este proyecto a verificación porque no tiene una
          organización asociada. Por favor, asocie una organización antes de
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
