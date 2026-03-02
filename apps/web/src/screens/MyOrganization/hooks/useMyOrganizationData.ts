import { useEffect } from "react";
import { useSnackbar } from "notistack";
import {
  useOrganization,
  useOrganizationUsers,
} from "@/api/query/organizations";

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

  const {
    data: usersData,
    error: usersError,
    isLoading: isLoadingUsers,
  } = useOrganizationUsers(organization?.id ?? "");

  useEffect(() => {
    if (organizationError) {
      enqueueSnackbar("No se pudo cargar la información de la organización", {
        variant: "error",
      });
    }
  }, [organizationError, enqueueSnackbar]);

  useEffect(() => {
    if (usersError) {
      enqueueSnackbar("No se pudo cargar la lista de usuarios", {
        variant: "error",
      });
    }
  }, [usersError, enqueueSnackbar]);

  return {
    organization,
    isLoadingOrganization,
    hasOrganizationError: !!organizationError,
    organizationUsers: usersData?.users ?? [],
    isLoadingUsers,
    hasUsersError: !!usersError,
  };
};
