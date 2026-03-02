import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { CreateOrganizationBody } from "@repo/types";
import {
  useCreateOrganization,
  useUpdateOrganization,
} from "@/api/query/organizations";

interface UseMyOrganizationSubmitProps {
  organizationId?: string;
  onSuccess?: () => void;
}

/**
 * Manages organization create/update mutations
 * Handles success/error feedback and cache invalidation
 */
export const useMyOrganizationSubmit = ({
  organizationId,
  onSuccess,
}: UseMyOrganizationSubmitProps = {}) => {
  const { enqueueSnackbar } = useSnackbar();
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization(organizationId ?? "");

  const handleOrganizationCreation = useCallback(
    async (data: CreateOrganizationBody) => {
      try {
        await createOrganization.mutateAsync(data);
        enqueueSnackbar("Organización creada exitosamente", {
          variant: "success",
        });
        onSuccess?.();
      } catch (error) {
        enqueueSnackbar("No se pudo crear la organización", {
          variant: "error",
        });
      }
    },
    [createOrganization, enqueueSnackbar, onSuccess]
  );

  const handleOrganizationUpdate = useCallback(
    async (data: CreateOrganizationBody) => {
      if (!organizationId) return;

      try {
        await updateOrganization.mutateAsync(data);
        enqueueSnackbar("Organización actualizada exitosamente", {
          variant: "success",
        });
        onSuccess?.();
      } catch (error) {
        enqueueSnackbar("No se pudo actualizar la organización", {
          variant: "error",
        });
      }
    },
    [organizationId, updateOrganization, enqueueSnackbar, onSuccess]
  );

  return {
    handleOrganizationCreation,
    handleOrganizationUpdate,
    isSubmitting: createOrganization.isPending || updateOrganization.isPending,
  };
};
