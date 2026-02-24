import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

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
      <DialogTitle id="block-org-dialog-title">Eliminar empresa</DialogTitle>
      <DialogContent>
        <DialogContentText id="block-org-dialog-description">
          ¿Estás seguro de que deseas eliminar la empresa{" "}
          <strong>{organizationName}</strong>? La empresa será bloqueada y no
          podrá usar las funcionalidades del sistema.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} color="error" disabled={isLoading}>
          {isLoading ? "Eliminando..." : "Eliminar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
