import { useCallback } from "react";
import { useSnackbar } from "notistack";
import {
  useCreateOrganization,
  useUpdateOrganization,
} from "@/api/query/organizations";
import { usePreUploadSubmissionFiles } from "@/api/query/submissions/usePreUploadSubmissionFiles";
import { mapFormValuesToRequest } from "../../../mappers";
import { DialogMode, OrganizationFormValues } from "../../../types";
import { VOCAB } from "@/config/vocab";
import capitalize from "lodash-es/capitalize";

interface UseOrganizationSubmitProps {
  mode: DialogMode;
  organizationId?: string;
  onSuccess?: () => void;
  onCreated?: (organizationId: string) => void;
}

export const useOrganizationSubmit = ({
  mode,
  organizationId,
  onSuccess,
  onCreated,
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
        } else if (mode === DialogMode.create) {
          const created = await createMutation.mutateAsync(requestData);
          onCreated?.(created.id);
        } else {
          await updateMutation.mutateAsync(requestData);
        }

        enqueueSnackbar(
          `${capitalize(VOCAB.organization.noun.singular)} ${mode === DialogMode.create ? "creada" : "actualizada"} exitosamente`,
          {
            variant: "success",
          }
        );
        onSuccess?.();
      } catch (error) {
        enqueueSnackbar(
          `No se pudo ${mode === DialogMode.create ? "crear" : "actualizar"} la ${VOCAB.organization.noun.singular}`,
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
      onCreated,
    ]
  );

  return {
    submit,
    isSubmitting:
      createMutation.isPending || updateMutation.isPending || isUploading,
  };
};
