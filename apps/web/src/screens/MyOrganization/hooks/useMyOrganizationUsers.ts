import { useCallback, useState } from "react";
import {
  useAddOrganizationUser,
  useUpdateOrganizationUserRole,
  useRemoveOrganizationUser,
} from "@/api/query/organizations";

interface AddUserFormData {
  email: string;
  role: string;
}

interface EditUserRoleFormData {
  role: string;
}

/**
 * Manages organization users data and actions
 */
export const useMyOrganizationUsers = (organizationId: string) => {
  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Selected user info
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState<string | null>(null);

  // Mutations
  const addUserMutation = useAddOrganizationUser();
  const updateUserRoleMutation = useUpdateOrganizationUserRole();
  const removeUserMutation = useRemoveOrganizationUser();

  // Add user handlers
  const openAddUserDialog = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  const closeAddUserDialog = useCallback(() => {
    setAddDialogOpen(false);
  }, []);

  const handleAddUser = useCallback(
    async (data: AddUserFormData) => {
      try {
        await addUserMutation.mutateAsync({
          organizationId,
          data: {
            email: data.email,
            role: data.role,
          },
        });
        closeAddUserDialog();
      } catch (error) {
        console.error("Error adding user:", error);
      }
    },
    [organizationId, addUserMutation, closeAddUserDialog]
  );

  // Edit user role handlers
  const openEditUserDialog = useCallback(
    (userId: string, userName: string, role: string) => {
      setSelectedUserId(userId);
      setSelectedUserName(userName);
      setSelectedUserRole(role);
      setEditDialogOpen(true);
    },
    []
  );

  const closeEditUserDialog = useCallback(() => {
    setEditDialogOpen(false);
    setSelectedUserId(null);
    setSelectedUserName(null);
    setSelectedUserRole(null);
  }, []);

  const handleUpdateUserRole = useCallback(
    async (data: EditUserRoleFormData) => {
      if (!selectedUserId) return;

      try {
        await updateUserRoleMutation.mutateAsync({
          organizationId,
          userId: selectedUserId,
          data: {
            role: data.role as any,
          },
        });
        closeEditUserDialog();
      } catch (error) {
        console.error("Error updating user role:", error);
      }
    },
    [
      organizationId,
      selectedUserId,
      updateUserRoleMutation,
      closeEditUserDialog,
    ]
  );

  // Delete user handlers
  const openDeleteUserDialog = useCallback(
    (userId: string, userName: string) => {
      setSelectedUserId(userId);
      setSelectedUserName(userName);
      setDeleteDialogOpen(true);
    },
    []
  );

  const closeDeleteUserDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedUserId(null);
    setSelectedUserName(null);
  }, []);

  const handleDeleteUser = useCallback(async () => {
    if (!selectedUserId) return;

    try {
      await removeUserMutation.mutateAsync({
        organizationId,
        userId: selectedUserId,
      });
      closeDeleteUserDialog();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  }, [
    organizationId,
    selectedUserId,
    removeUserMutation,
    closeDeleteUserDialog,
  ]);

  return {
    // Dialog state
    addDialogOpen,
    editDialogOpen,
    deleteDialogOpen,

    // Selected user info
    selectedUserName,
    selectedUserRole,

    // Loading states
    isAddingUser: addUserMutation.isPending,
    isUpdatingUser: updateUserRoleMutation.isPending,
    isDeletingUser: removeUserMutation.isPending,

    // Handlers
    openAddUserDialog,
    closeAddUserDialog,
    handleAddUser,
    openEditUserDialog,
    closeEditUserDialog,
    handleUpdateUserRole,
    openDeleteUserDialog,
    closeDeleteUserDialog,
    handleDeleteUser,
  };
};
