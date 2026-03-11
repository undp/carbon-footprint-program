import { useState, useCallback } from "react";
import { useSnackbar } from "notistack";
import { AppHttpError } from "@/api/http/errors";
import {
  usePreUploadSubmissionFiles,
  useRequestOrganizationAccreditation,
} from "@/api/query";

export const useAccreditationDialog = (organizationId: string | undefined) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const { mutateAsync: requestAccreditation } =
    useRequestOrganizationAccreditation(organizationId);
  const preUploadFiles = usePreUploadSubmissionFiles();

  const openDialog = useCallback(() => setIsOpen(true), []);
  const closeDialog = useCallback(() => setIsOpen(false), []);

  const handleConfirm = useCallback(
    async (files: File[]) => {
      if (!organizationId) {
        enqueueSnackbar("Error: ID de organización no disponible", {
          variant: "error",
        });
        closeDialog();
        return;
      }

      setIsSubmitting(true);
      try {
        // Step 1: upload files first — if this fails, no submission is created
        const fileUuids = await preUploadFiles(files);
        // Step 2: create submission with file references atomically
        await requestAccreditation(fileUuids);
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
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      organizationId,
      requestAccreditation,
      preUploadFiles,
      enqueueSnackbar,
      closeDialog,
    ]
  );

  return {
    isOpen,
    openDialog,
    closeDialog,
    handleConfirm,
    isLoading: isSubmitting,
  };
};
