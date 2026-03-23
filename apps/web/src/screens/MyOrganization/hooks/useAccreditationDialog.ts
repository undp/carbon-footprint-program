import { useState, useCallback } from "react";
import { VOCAB } from "@/config/vocab";
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
  const { preUploadFiles, isUploading } = usePreUploadSubmissionFiles();

  const openDialog = useCallback(() => setIsOpen(true), []);
  const closeDialog = useCallback(() => setIsOpen(false), []);

  const handleConfirm = useCallback(
    async (files: File[]) => {
      if (!organizationId) {
        enqueueSnackbar(
          `Error: ID de ${VOCAB.organization.article.singular} no disponible`,
          {
            variant: "error",
          }
        );
        closeDialog();
        return;
      }

      setIsSubmitting(true);
      try {
        // Step 1: upload files first — if this fails, no submission is created
        const fileUuids = await preUploadFiles(files);
        // Step 2: create submission with file references atomically
        await requestAccreditation(fileUuids);
        enqueueSnackbar(
          `Solicitud de ${VOCAB.inscription.noun.singular} enviada exitosamente`,
          {
            variant: "success",
          }
        );
        closeDialog();
      } catch (error) {
        let message = `Error al solicitar ${VOCAB.inscription.article.singular}`;

        if (error instanceof AppHttpError) {
          const body = error.detail.body;
          if (body) {
            const errorCode = (body as { code: string }).code;
            if (errorCode === "SUBMISSION_ALREADY_EXISTS") {
<<<<<<< feat/mati/add-centralized-vocab
              message = `Ya existe una solicitud de ${VOCAB.inscription.noun.singular} pendiente para esta ${VOCAB.organization.noun.singular}.`;
=======
              message =
                "Ya existe una solicitud de acreditación pendiente para esta organización.";
>>>>>>> main
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
    isLoading: isSubmitting || isUploading,
  };
};
