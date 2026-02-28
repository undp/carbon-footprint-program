import { useEffect } from "react";
import { useSnackbar } from "notistack";
import { useOrganization } from "@/api/query/organizations";

interface UseMyOrganizationDataProps {
  activeOrganizationId?: string | null;
}

/**
 * Manages organization data fetching and error handling
 * Centralizes API queries for organization details
 */
export const useMyOrganizationData = ({
  activeOrganizationId,
}: UseMyOrganizationDataProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const {
    data: organization,
    error: organizationError,
    isLoading: isLoadingOrganization,
  } = useOrganization(activeOrganizationId ?? "");

  useEffect(() => {
    if (organizationError) {
      enqueueSnackbar("No se pudo cargar la información de la organización", {
        variant: "error",
      });
    }
  }, [organizationError, enqueueSnackbar]);

  return {
    organization,
    isLoadingOrganization,
    hasError: !!organizationError,
  };
};
