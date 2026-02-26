import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

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
      <DialogTitle id="unblock-org-dialog-title">Restaurar empresa</DialogTitle>
      <DialogContent>
        <DialogContentText id="unblock-org-dialog-description">
          ¿Estás seguro de que deseas restaurar la empresa{" "}
          <strong>{organizationName}</strong>? La empresa será desbloqueada y
          podrá volver a usar las funcionalidades del sistema.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} color="primary" disabled={isLoading}>
          {isLoading ? "Restaurando..." : "Restaurar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
