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

interface BlockOrganizationDialogProps {
  open: boolean;
  organizationName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const BlockOrganizationDialog: FC<BlockOrganizationDialogProps> = ({
  open,
  organizationName,
  onClose,
  onConfirm,
  isLoading,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="block-org-dialog-title"
      aria-describedby="block-org-dialog-description"
    >
      <DialogTitle id="block-org-dialog-title">
        Bloquear {VOCAB.organization.article.singular}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="block-org-dialog-description">
          ¿Estás seguro de que deseas bloquear{" "}
          {VOCAB.organization.article.singular}{" "}
          <strong>{organizationName}</strong>?{" "}
          {capitalize(VOCAB.organization.article.singular)} será bloqueada y no
          podrá usar las funcionalidades del sistema.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} color="error" disabled={isLoading}>
          {isLoading ? "Bloqueando..." : "Bloquear"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
