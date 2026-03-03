import { useCallback } from "react";
import { CreateOrganizationBody } from "@repo/types";
import { useSnackbar } from "notistack";
import {
  useCreateOrganization,
  useUpdateOrganization,
} from "@/api/query/organizations";
import { mapFormValuesToRequest } from "../../../transformers";
import { DialogMode } from "../../../types";

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
  const updateMutation = useUpdateOrganization(organizationId ?? "");

  const submit = useCallback(
    async (data: CreateOrganizationBody) => {
      try {
        const requestData = mapFormValuesToRequest(data);
        await (mode === "create"
          ? createMutation.mutateAsync(requestData)
          : updateMutation.mutateAsync(requestData));
        enqueueSnackbar(
          `Organización ${mode === "create" ? "creada" : "actualizada"} exitosamente`,
          {
            variant: "success",
          }
        );
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
    submit,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
  };
};
