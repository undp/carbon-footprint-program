import { useEffect } from "react";
import { useSnackbar } from "notistack";
import {
  useOrganization,
  useOrganizationUsers,
} from "@/api/query/organizations";
import { VOCAB } from "@/config/vocab";

interface UseMyOrganizationDataProps {
  activeOrganizationId?: string | null;
}

/**
 * Manages organization data fetching and error handling for the MyOrganization screen.
 * Centralizes API queries for organization details and users, with automatic error handling
 * via snackbar notifications.
 *
 * Only fetches data when a valid organization ID is provided.
 * Skips queries when activeOrganizationId is undefined or null.
 *
 * Error Handling Pattern:
 * - Queries (GET): Use useEffect with error state and enqueueSnackbar
 *   - Automatically displays user-friendly Spanish error messages
 *   - Monitors error state changes to notify users
 * - Mutations (POST/PUT/DELETE): Use try-catch in handlers (see useMyOrganizationUsers)
 *
 * @param {UseMyOrganizationDataProps} params - Configuration object
 * @param {string | null | undefined} params.activeOrganizationId - The ID of the organization to fetch (undefined = loading, null = no orgs)
 * @returns {Object} Organization data object
 * @returns {GetOrganizationByIdResponse | undefined} organization - Organization details
 * @returns {boolean} isLoadingOrganization - Whether organization data is loading
 * @returns {boolean} hasOrganizationError - Whether there was an error loading organization data
 * @returns {Array} organizationUsers - List of organization users (empty array if no data)
 * @returns {boolean} isLoadingUsers - Whether users data is loading
 * @returns {boolean} hasUsersError - Whether there was an error loading users data
 */
export const useMyOrganizationData = ({
  activeOrganizationId,
}: UseMyOrganizationDataProps) => {
  const { enqueueSnackbar } = useSnackbar();

  // Only fetch organization if we have a valid ID
  // undefined = still initializing, null = no orgs exist, string = valid ID
  const activeOrgId =
    activeOrganizationId !== undefined && activeOrganizationId !== null
      ? activeOrganizationId
      : undefined;

  const {
    data: organization,
    error: organizationError,
    isLoading: isLoadingOrganization,
  } = useOrganization(activeOrgId);

  const {
    data: usersData,
    error: usersError,
    isLoading: isLoadingUsers,
  } = useOrganizationUsers(organization?.id);

  useEffect(() => {
    if (organizationError) {
      enqueueSnackbar(
        `No se pudo cargar la información de la ${VOCAB.organization.noun.singular}`,
        {
          variant: "error",
        }
      );
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
    organizationUsers: usersData,
    isLoadingUsers,
    hasUsersError: !!usersError,
  };
};

export type UseMyOrganizationDataReturn = ReturnType<
  typeof useMyOrganizationData
>;
