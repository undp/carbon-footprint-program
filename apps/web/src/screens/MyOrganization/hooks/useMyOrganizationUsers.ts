import { useCallback, useEffect } from "react";
import { useUserDialogsState } from "./useUserDialogsState";
import { useUserMutations } from "./useUserMutations";
import { AddUserFormData, EditUserRoleFormData } from "../types";

/**
 * Orchestrates user management by combining dialog state and mutations
 * Maintains backward compatibility with the original interface
 *
 * This hook follows the Single Responsibility Principle by delegating:
 * - Dialog state management to useUserDialogsState
 * - API mutations to useUserMutations
 * - Coordination between the two (closing dialogs on success)
 *
 * Error Handling Pattern:
 * - Mutations (POST/PUT/DELETE): Use try-catch in handlers with enqueueSnackbar
 *   - Displays user-friendly Spanish error messages
 *   - Does not prevent dialog from remaining open on error
 * - Queries (GET): Use useEffect with error state (see useMyOrganizationData)
 *
 * @param {string | undefined} organizationId - The ID of the organization to manage users for (undefined when loading)
 * @returns {Object} User management object
 * @returns {boolean} addDialogOpen - Whether the add user dialog is open
 * @returns {boolean} editDialogOpen - Whether the edit user role dialog is open
 * @returns {boolean} deleteDialogOpen - Whether the delete user confirmation dialog is open
 * @returns {string | null} selectedUserName - Name of the currently selected user
 * @returns {string | null} selectedUserRole - Role of the currently selected user
 * @returns {boolean} isAddingUser - Whether a user is currently being added
 * @returns {boolean} isUpdatingUser - Whether a user role is currently being updated
 * @returns {boolean} isDeletingUser - Whether a user is currently being deleted
 * @returns {Function} openAddUserDialog - Opens the add user dialog
 * @returns {Function} closeAddUserDialog - Closes the add user dialog
 * @returns {Function} handleAddUser - Handles adding a new user to the organization
 * @returns {Function} openEditUserDialog - Opens the edit user role dialog
 * @returns {Function} closeEditUserDialog - Closes the edit user role dialog
 * @returns {Function} handleUpdateUserRole - Handles updating a user's role
 * @returns {Function} openDeleteUserDialog - Opens the delete user confirmation dialog
 * @returns {Function} closeDeleteUserDialog - Closes the delete user confirmation dialog
 * @returns {Function} handleDeleteUser - Handles deleting a user from the organization
 */
export const useMyOrganizationUsers = (organizationId: string | undefined) => {
  // Get dialog state management
  const dialogsState = useUserDialogsState();

  // Get mutation handlers
  const mutations = useUserMutations(organizationId);

  // Close all dialogs when the organization changes to prevent stale user data
  useEffect(() => {
    dialogsState.closeAddUserDialog();
    dialogsState.closeEditUserDialog();
    dialogsState.closeDeleteUserDialog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  // Connect mutations to dialog close callbacks
  const handleAddUser = useCallback(
    async (data: AddUserFormData) => {
      try {
        await mutations.handleAddUser(data);
        dialogsState.closeAddUserDialog();
      } catch {
        // Error already handled in useUserMutations with snackbar
        // Keep dialog open for user to retry or fix input
      }
    },
    [mutations, dialogsState]
  );

  const handleUpdateUserRole = useCallback(
    async (data: EditUserRoleFormData) => {
      if (!dialogsState.selectedUserId) return;

      try {
        await mutations.handleUpdateUserRole(dialogsState.selectedUserId, data);
        dialogsState.closeEditUserDialog();
      } catch {
        // Error already handled in useUserMutations with snackbar
        // Keep dialog open for user to retry or fix input
      }
    },
    [mutations, dialogsState]
  );

  const handleDeleteUser = useCallback(async () => {
    if (!dialogsState.selectedUserId) return;

    try {
      await mutations.handleDeleteUser(dialogsState.selectedUserId);
      dialogsState.closeDeleteUserDialog();
    } catch {
      // Error already handled in useUserMutations with snackbar
      // Keep dialog open for user to retry
    }
  }, [mutations, dialogsState]);

  return {
    // Dialog state
    addDialogOpen: dialogsState.addDialogOpen,
    editDialogOpen: dialogsState.editDialogOpen,
    deleteDialogOpen: dialogsState.deleteDialogOpen,

    // Selected user info
    selectedUserName: dialogsState.selectedUserName,
    selectedUserRole: dialogsState.selectedUserRole,

    // Loading states
    isAddingUser: mutations.isAddingUser,
    isUpdatingUser: mutations.isUpdatingUser,
    isDeletingUser: mutations.isDeletingUser,

    // Handlers
    openAddUserDialog: dialogsState.openAddUserDialog,
    closeAddUserDialog: dialogsState.closeAddUserDialog,
    handleAddUser,
    openEditUserDialog: dialogsState.openEditUserDialog,
    closeEditUserDialog: dialogsState.closeEditUserDialog,
    handleUpdateUserRole,
    openDeleteUserDialog: dialogsState.openDeleteUserDialog,
    closeDeleteUserDialog: dialogsState.closeDeleteUserDialog,
    handleDeleteUser,
  };
};

export type UseMyOrganizationUsersReturn = ReturnType<
  typeof useMyOrganizationUsers
>;
