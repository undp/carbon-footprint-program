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

interface UnblockOrganizationDialogProps {
  open: boolean;
  organizationName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const UnblockOrganizationDialog: FC<UnblockOrganizationDialogProps> = ({
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
      aria-labelledby="unblock-org-dialog-title"
      aria-describedby="unblock-org-dialog-description"
    >
      <DialogTitle id="unblock-org-dialog-title">
        Desbloquear {VOCAB.organization.article.singular}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="unblock-org-dialog-description">
          ¿Estás seguro de que deseas desbloquear{" "}
          {VOCAB.organization.article.singular}{" "}
          <strong>{organizationName}</strong>?{" "}
          {capitalize(VOCAB.organization.article.singular)} será desbloqueada y
          podrá volver a usar las funcionalidades del sistema.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} color="primary" disabled={isLoading}>
          {isLoading ? "Desbloqueando..." : "Desbloquear"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
