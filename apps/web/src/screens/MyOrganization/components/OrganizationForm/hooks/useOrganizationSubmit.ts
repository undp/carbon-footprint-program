import { useCallback } from "react";
import { useSnackbar } from "notistack";
import {
  useCreateOrganization,
  useUpdateOrganization,
} from "@/api/query/organizations";
import { usePreUploadSubmissionFiles } from "@/api/query/submissions/usePreUploadSubmissionFiles";
import { mapFormValuesToRequest } from "../../../mappers";
import { DialogMode, OrganizationFormValues } from "../../../types";

interface UseOrganizationSubmitProps {
  mode: DialogMode;
  organizationId?: string;
  onSuccess?: () => void;
}

export const useOrganizationSubmit = ({
  mode,
  organizationId,
  onSuccess,
}: UseOrganizationSubmitProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization(organizationId);
  const { preUploadFiles, isUploading } = usePreUploadSubmissionFiles();

  const submit = useCallback(
    async (data: OrganizationFormValues) => {
      try {
        const { files, ...orgData } = data;
        const requestData = mapFormValuesToRequest(orgData);

        if (mode === DialogMode.accredited) {
          const fileUuids = await preUploadFiles(files);
          await updateMutation.mutateAsync({ ...requestData, fileUuids });
        } else {
          await (mode === DialogMode.create
            ? createMutation.mutateAsync(requestData)
            : updateMutation.mutateAsync(requestData));
        }

        enqueueSnackbar(
          `Organización ${mode === DialogMode.create ? "creada" : "actualizada"} exitosamente`,
          {
            variant: "success",
          }
        );
        onSuccess?.();
      } catch (error) {
        enqueueSnackbar(
          `No se pudo ${mode === DialogMode.create ? "crear" : "actualizar"} la organización`,
          { variant: "error" }
        );
        throw error;
      }
    },
    [
      mode,
      preUploadFiles,
      createMutation,
      updateMutation,
      enqueueSnackbar,
      onSuccess,
    ]
  );

  return {
    submit,
    isSubmitting:
      createMutation.isPending || updateMutation.isPending || isUploading,
  };
};
