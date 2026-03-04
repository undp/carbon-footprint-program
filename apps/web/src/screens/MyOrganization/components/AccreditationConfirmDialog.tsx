import { FC } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface AccreditationConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const AccreditationConfirmDialog: FC<
  AccreditationConfirmDialogProps
> = ({ open, onClose, onConfirm, isLoading }) => {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Solicitar acreditación"
      message="¿Está seguro de que desea solicitar la acreditación de su organización?"
      description="Esta acción enviará una solicitud al administrador para revisar y aprobar la acreditación."
      variant="info"
      confirmLabel="Solicitar"
      cancelLabel="Cancelar"
      isLoading={isLoading}
    />
  );
};
