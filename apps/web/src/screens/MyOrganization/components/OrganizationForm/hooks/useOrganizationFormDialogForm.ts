import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { CreateOrganizationBody } from "@repo/types";
import { useSnackbar } from "notistack";
import {
  useCreateOrganization,
  useUpdateOrganization,
} from "@/api/query/organizations";
import { mapFormValuesToRequest } from "../../../transformers";
import { DialogMode } from "../../../types";

interface UseOrganizationFormDialogFormProps {
  initialValues: CreateOrganizationBody;
  mode: DialogMode;
  organizationId?: string;
  onSuccess?: () => void;
}

/**
 * Manages form state and submission logic for the OrganizationFormDialog.
 * Handles both organization creation and updates based on the dialog mode,
 * with automatic success/error notifications via snackbar.
 *
 * @param {UseOrganizationFormDialogFormProps} params - Configuration object
 * @param {CreateOrganizationBody} params.initialValues - Initial form values
 * @param {DialogMode} params.mode - Dialog mode (create, edit, or accreditation)
 * @param {string} params.organizationId - ID of organization to update (only for edit/accreditation modes)
 * @param {Function} params.onSuccess - Callback function executed after successful form submission
 * @returns {Object} Form management object
 * @returns {UseFormReturn<CreateOrganizationBody>} form - React Hook Form instance
 * @returns {Function} onSubmit - Form submission handler
 * @returns {boolean} isSubmitting - Whether the form is currently being submitted
 */
export const useOrganizationFormDialogForm = ({
  initialValues,
  mode,
  organizationId,
  onSuccess,
}: UseOrganizationFormDialogFormProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const form = useForm<CreateOrganizationBody>({
    values: initialValues,
  });

  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization(organizationId ?? "");

  const onSubmit = useCallback(
    async (data: CreateOrganizationBody) => {
      try {
        if (mode === "create") {
          const requestData = mapFormValuesToRequest(data);
          await createMutation.mutateAsync(requestData);
          enqueueSnackbar("Organización creada exitosamente", {
            variant: "success",
          });
        } else {
          const requestData = mapFormValuesToRequest(data);
          await updateMutation.mutateAsync(requestData);
          enqueueSnackbar("Organización actualizada exitosamente", {
            variant: "success",
          });
        }
        onSuccess?.();
      } catch {
        enqueueSnackbar(
          `No se pudo ${mode === "create" ? "crear" : "actualizar"} la organización`,
          { variant: "error" }
        );
      }
    },
    [mode, createMutation, updateMutation, enqueueSnackbar, onSuccess]
  );

  return {
    form,
    onSubmit,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
  };
};

export type UseOrganizationFormDialogFormReturn = ReturnType<
  typeof useOrganizationFormDialogForm
>;
