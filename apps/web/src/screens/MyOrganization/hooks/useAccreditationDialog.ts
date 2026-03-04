import { useState } from "react";
import { useSnackbar } from "notistack";
import { useRequestOrganizationAccreditation } from "@/api/query/organizations";

export const useAccreditationDialog = (organizationId: string | undefined) => {
  const [isOpen, setIsOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const mutation = useRequestOrganizationAccreditation(organizationId ?? "");

  const openDialog = () => setIsOpen(true);
  const closeDialog = () => setIsOpen(false);

  const handleConfirm = async () => {
    if (!organizationId) {
      enqueueSnackbar("Error: ID de organización no disponible", {
        variant: "error",
      });
      closeDialog();
      return;
    }

    try {
      await mutation.mutateAsync();
      enqueueSnackbar("Solicitud de acreditación enviada exitosamente", {
        variant: "success",
      });
      closeDialog();
    } catch (error) {
      enqueueSnackbar("Error al solicitar la acreditación", {
        variant: "error",
      });
      // Keep dialog open on error for retry
    }
  };

  return {
    isOpen,
    openDialog,
    closeDialog,
    handleConfirm,
    isLoading: mutation.isPending,
  };
};
