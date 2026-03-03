import { FC } from "react";
import { Box } from "@mui/material";
import { MainLayout } from "@/components/layout";
import {
  OrganizationProfileSection,
  OrganizationProfileSectionSkeleton,
  OrganizationHeader,
  OrganizationUsersTable,
  OrganizationUsersTableSkeleton,
  OrganizationFormDialog,
  OrganizationEmptyState,
  AddUserDialog,
  EditUserRoleDialog,
  DeleteUserConfirmationDialog,
} from "./components";
import {
  useMyOrganizationData,
  useMyOrganizationState,
  useMyOrganizationUsers,
} from "./hooks";

export const MyOrganizationScreen: FC = () => {
  // UI state management with explicit state tracking
  const {
    activeOrganizationId,
    organizationStatus,
    formDialogMode,
    formDialogOpen,
    handleOrganizationChange,
    closeFormDialog,
    onEditOrganizationProfile,
  } = useMyOrganizationState();

  // Data fetching - only fetch when we have a valid organization ID
  // Guards prevent premature fetching when activeOrganizationId is undefined
  const { organization, organizationUsers, isLoadingUsers } =
    useMyOrganizationData({ activeOrganizationId });

  // User management - pass undefined instead of empty string when not loaded
  // This prevents premature mutation attempts
  const {
    addDialogOpen,
    editDialogOpen,
    deleteDialogOpen,
    selectedUserName,
    selectedUserRole,
    isAddingUser,
    isUpdatingUser,
    isDeletingUser,
    openAddUserDialog,
    closeAddUserDialog,
    handleAddUser,
    openEditUserDialog,
    closeEditUserDialog,
    handleUpdateUserRole,
    openDeleteUserDialog,
    closeDeleteUserDialog,
    handleDeleteUser,
  } = useMyOrganizationUsers(organization?.id);

  // No organizations exist - explicit state check
  if (organizationStatus === "no_organizations") {
    return (
      <MainLayout>
        <OrganizationEmptyState onSuccess={closeFormDialog} />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box className="flex flex-1 flex-col gap-6 p-6">
        <OrganizationHeader onOrganizationChange={handleOrganizationChange} />

        {organization ? (
          <>
            <OrganizationProfileSection
              profile={organization}
              onEdit={onEditOrganizationProfile}
            />

            <OrganizationUsersTable
              users={organizationUsers ?? []}
              onAdd={openAddUserDialog}
              onEdit={openEditUserDialog}
              onDelete={openDeleteUserDialog}
              isLoading={isLoadingUsers}
            />

            <OrganizationFormDialog
              open={formDialogOpen}
              onClose={closeFormDialog}
              organization={organization}
              mode={formDialogMode}
            />

            <AddUserDialog
              open={addDialogOpen}
              onClose={closeAddUserDialog}
              onSubmit={handleAddUser}
              isSubmitting={isAddingUser}
            />

            <EditUserRoleDialog
              open={editDialogOpen}
              onClose={closeEditUserDialog}
              onSubmit={handleUpdateUserRole}
              currentRole={selectedUserRole ?? undefined}
              userName={selectedUserName ?? undefined}
              isSubmitting={isUpdatingUser}
            />

            <DeleteUserConfirmationDialog
              open={deleteDialogOpen}
              onClose={closeDeleteUserDialog}
              onConfirm={handleDeleteUser}
              userName={selectedUserName ?? undefined}
              isDeleting={isDeletingUser}
            />
          </>
        ) : (
          <>
            <OrganizationProfileSectionSkeleton />
            <OrganizationUsersTableSkeleton />
          </>
        )}
      </Box>
    </MainLayout>
  );
};
