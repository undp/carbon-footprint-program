import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { CreateOrganizationBody } from "@repo/types";
import { useSnackbar } from "notistack";
import {
  useCreateOrganization,
  useUpdateOrganization,
} from "@/api/query/organizations";
import { mapFormValuesToRequest } from "../../../transformers";

type DialogMode = "create" | "edit" | "accreditation";

interface UseOrganizationFormDialogFormProps {
  initialValues: CreateOrganizationBody;
  mode: DialogMode;
  organizationId?: string;
  onSuccess?: () => void;
}

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
