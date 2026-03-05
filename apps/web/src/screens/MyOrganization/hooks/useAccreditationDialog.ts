import { useState, useCallback } from "react";
import { useSnackbar } from "notistack";
import { useRequestOrganizationAccreditation } from "@/api/query/organizations";
import { AppHttpError } from "@/api/http/errors";

export const useAccreditationDialog = (organizationId: string | undefined) => {
  const [isOpen, setIsOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const mutation = useRequestOrganizationAccreditation(organizationId);

  const openDialog = useCallback(() => setIsOpen(true), []);
  const closeDialog = useCallback(() => setIsOpen(false), []);

  const handleConfirm = useCallback(async () => {
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
      let message = "Error al solicitar la acreditación";

      if (error instanceof AppHttpError) {
        const body = error.detail.body;
        if (body) {
          const errorCode = (body as { code: string }).code;
          if (errorCode === "ORGANIZATION_DATA_ALREADY_REJECTED") {
            message =
              "La información a postular fue rechazada. Por favor, actualiza tu información para poder postular nuevamente.";
          } else if (errorCode === "SUBMISSION_ALREADY_EXISTS") {
            message =
              "Ya existe una solicitud de acreditación pendiente para esta organización.";
          }
        }
      }

      enqueueSnackbar(message, {
        variant: "error",
      });
      // Keep dialog open on error for retry
    }
  }, [organizationId, mutation, enqueueSnackbar, closeDialog]);

  return {
    isOpen,
    openDialog,
    closeDialog,
    handleConfirm,
    isLoading: mutation.isPending,
  };
};
