import { useCallback } from "react";
import { useSnackbar } from "notistack";
import {
  useAddOrganizationUser,
  useUpdateOrganizationUserRole,
  useRemoveOrganizationUser,
} from "@/api/query/organizations";
import { OrganizationRole } from "../types";
import { AddUserFormData, EditUserRoleFormData } from "../types";

interface UserMutations {
  // Mutation handlers
  handleAddUser: (data: AddUserFormData) => Promise<void>;
  handleUpdateUserRole: (
    userId: string,
    data: EditUserRoleFormData
  ) => Promise<void>;
  handleDeleteUser: (userId: string) => Promise<void>;

  // Loading states
  isAddingUser: boolean;
  isUpdatingUser: boolean;
  isDeletingUser: boolean;
}

/**
 * Handles API mutations for user management
 * Manages add/update/delete operations with success/error handling
 *
 * Error Handling Pattern:
 * - Mutations (POST/PUT/DELETE): Use try-catch in handlers with enqueueSnackbar
 *   - Displays user-friendly Spanish error messages
 *   - Re-throws error for caller to handle (e.g., keep dialog open)
 * - Queries (GET): Use useEffect with error state (see useMyOrganizationData)
 *
 * @param organizationId - The ID of the organization to manage users for (undefined when loading)
 * @returns Object containing mutation handlers and loading states
 */
export const useUserMutations = (
  organizationId: string | undefined
): UserMutations => {
  const { enqueueSnackbar } = useSnackbar();

  // Mutations
  const addUserMutation = useAddOrganizationUser();
  const updateUserRoleMutation = useUpdateOrganizationUserRole();
  const removeUserMutation = useRemoveOrganizationUser();

  // Add user handler
  const handleAddUser = useCallback(
    async (data: AddUserFormData) => {
      // Guard: Don't execute if organizationId is undefined
      if (!organizationId) {
        enqueueSnackbar(
          "No se puede agregar usuario: organización no cargada",
          {
            variant: "error",
          }
        );
        throw new Error("Organization ID is undefined");
      }

      try {
        await addUserMutation.mutateAsync({
          organizationId,
          data: {
            email: data.email,
            role: data.role as OrganizationRole,
          },
        });
        enqueueSnackbar("Usuario agregado exitosamente", {
          variant: "success",
        });
      } catch (error) {
        enqueueSnackbar("No se pudo agregar el usuario a la organización", {
          variant: "error",
        });
        throw error;
      }
    },
    [organizationId, addUserMutation, enqueueSnackbar]
  );

  // Update user role handler
  const handleUpdateUserRole = useCallback(
    async (userId: string, data: EditUserRoleFormData) => {
      // Guard: Don't execute if organizationId is undefined
      if (!organizationId) {
        enqueueSnackbar("No se puede actualizar rol: organización no cargada", {
          variant: "error",
        });
        throw new Error("Organization ID is undefined");
      }

      try {
        await updateUserRoleMutation.mutateAsync({
          organizationId,
          userId,
          data: {
            role: data.role as OrganizationRole,
          },
        });
        enqueueSnackbar("Rol actualizado correctamente", {
          variant: "success",
        });
      } catch (error) {
        enqueueSnackbar("No se pudo actualizar el rol del usuario", {
          variant: "error",
        });
        throw error;
      }
    },
    [organizationId, updateUserRoleMutation, enqueueSnackbar]
  );

  // Delete user handler
  const handleDeleteUser = useCallback(
    async (userId: string) => {
      // Guard: Don't execute if organizationId is undefined
      if (!organizationId) {
        enqueueSnackbar(
          "No se puede eliminar usuario: organización no cargada",
          {
            variant: "error",
          }
        );
        throw new Error("Organization ID is undefined");
      }

      try {
        await removeUserMutation.mutateAsync({
          organizationId,
          userId,
        });
        enqueueSnackbar("Usuario eliminado", {
          variant: "success",
        });
      } catch (error) {
        enqueueSnackbar("No se pudo eliminar el usuario de la organización", {
          variant: "error",
        });
        throw error;
      }
    },
    [organizationId, removeUserMutation, enqueueSnackbar]
  );

  return {
    // Mutation handlers
    handleAddUser,
    handleUpdateUserRole,
    handleDeleteUser,

    // Loading states
    isAddingUser: addUserMutation.isPending,
    isUpdatingUser: updateUserRoleMutation.isPending,
    isDeletingUser: removeUserMutation.isPending,
  };
};
