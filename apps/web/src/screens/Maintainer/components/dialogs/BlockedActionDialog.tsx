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
  /** Title naming the blocked action, e.g. "No se puede restaurar". */
  title: string;
  /** Spanish, end-user-friendly message explaining why the action is blocked. */
  message: string;
  onClose: () => void;
}

/**
 * Informative dialog shown when a maintainer action is blocked by a business rule —
 * e.g. restoring a child whose parent is soft-deleted (`PARENT_NOT_ACTIVE`), or
 * renaming / re-parenting a catalog row that is still referenced by user data or
 * catalog children (`EDIT_BLOCKED_BY_REFERENCES`). Surfaces the localized reason with
 * a single dismiss button.
 */
export const BlockedActionDialog: FC<Props> = ({
  open,
  title,
  message,
  onClose,
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>{title}</DialogTitle>
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
