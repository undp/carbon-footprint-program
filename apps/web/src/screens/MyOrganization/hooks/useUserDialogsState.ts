import { OrganizationRole } from "@repo/types";
import { useCallback, useState } from "react";

interface UserDialogsState {
  // Dialog state
  addDialogOpen: boolean;
  editDialogOpen: boolean;
  deleteDialogOpen: boolean;

  // Selected user info
  selectedUserId: string | null;
  selectedUserName: string | null;
  selectedUserRole: OrganizationRole | null;

  // Add user handlers
  openAddUserDialog: () => void;
  closeAddUserDialog: () => void;

  // Edit user role handlers
  openEditUserDialog: (
    userId: string,
    userName: string,
    role: OrganizationRole
  ) => void;
  closeEditUserDialog: () => void;

  // Delete user handlers
  openDeleteUserDialog: (userId: string, userName: string) => void;
  closeDeleteUserDialog: () => void;
}

/**
 * Manages dialog UI state for user management
 * Handles dialog open/close state and selected user information
 */
export const useUserDialogsState = (): UserDialogsState => {
  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Selected user info
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [selectedUserRole, setSelectedUserRole] =
    useState<OrganizationRole | null>(null);

  // Add user handlers
  const openAddUserDialog = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  const closeAddUserDialog = useCallback(() => {
    setAddDialogOpen(false);
  }, []);

  // Edit user role handlers
  const openEditUserDialog = useCallback(
    (userId: string, userName: string, role: OrganizationRole) => {
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

  return {
    // Dialog state
    addDialogOpen,
    editDialogOpen,
    deleteDialogOpen,

    // Selected user info
    selectedUserId,
    selectedUserName,
    selectedUserRole,

    // Handlers
    openAddUserDialog,
    closeAddUserDialog,
    openEditUserDialog,
    closeEditUserDialog,
    openDeleteUserDialog,
    closeDeleteUserDialog,
  };
};
