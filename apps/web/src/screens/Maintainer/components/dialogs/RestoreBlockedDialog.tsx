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
  /** Spanish, end-user-friendly message provided by the backend (already names the parent). */
  message: string;
  onClose: () => void;
}

/**
 * Informative dialog shown when restoring a child entity (subsector / main activity) is
 * blocked because its parent is soft-deleted. The backend returns the human-readable
 * message in `error.apiMessage`; we surface it directly with a single dismiss button.
 */
export const RestoreBlockedDialog: FC<Props> = ({ open, message, onClose }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>No se puede restaurar</DialogTitle>
    <DialogContent>
      <DialogContentText>{message}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onClose} variant="contained" color="primary">
        Entendido
      </Button>
    </DialogActions>
  </Dialog>
);
