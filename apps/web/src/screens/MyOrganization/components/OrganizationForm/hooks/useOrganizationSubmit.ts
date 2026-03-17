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
  isAccredited?: boolean;
  onSuccess?: () => void;
}

export const useOrganizationSubmit = ({
  mode,
  organizationId,
  isAccredited,
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

        if (mode === "edit" && isAccredited) {
          const fileUuids = await preUploadFiles(files);
          await updateMutation.mutateAsync({ ...requestData, fileUuids });
        } else {
          await (mode === "create"
            ? createMutation.mutateAsync(requestData)
            : updateMutation.mutateAsync(requestData));
        }

        enqueueSnackbar(
          `Organización ${mode === "create" ? "creada" : "actualizada"} exitosamente`,
          {
            variant: "success",
          }
        );
        onSuccess?.();
      } catch (error) {
        enqueueSnackbar(
          `No se pudo ${mode === "create" ? "crear" : "actualizar"} la organización`,
          { variant: "error" }
        );
        throw error;
      }
    },
    [
      mode,
      isAccredited,
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
