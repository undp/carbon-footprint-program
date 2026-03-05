import { FC, useEffect, useRef } from "react";
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
import { useOrganizations } from "@/api/query/organizations";

export const MyOrganizationScreen: FC = () => {
  // Fetch user's organizations list
  const { data: organizations = [], isLoading: isLoadingOrganizations } =
    useOrganizations();

  // UI state management - simplified to just dialog state and selected org ID
  const {
    selectedOrganizationId,
    setSelectedOrganizationId,
    formDialogMode,
    formDialogOpen,
    closeFormDialog,
    onEditOrganizationProfile,
  } = useMyOrganizationState();

  // Set default organization (first one) when organizations load
  // Use ref to prevent race condition when organizations array reference changes
  const hasSetInitialOrg = useRef(false);

  useEffect(() => {
    if (
      !isLoadingOrganizations &&
      organizations.length > 0 &&
      !hasSetInitialOrg.current
    ) {
      setSelectedOrganizationId(organizations[0].id);
      hasSetInitialOrg.current = true;
    }
  }, [organizations, isLoadingOrganizations, setSelectedOrganizationId]);

  // Data fetching - only fetch when we have a selected organization
  const { organization, organizationUsers, isLoadingUsers } =
    useMyOrganizationData({ activeOrganizationId: selectedOrganizationId });

  // User management
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

  // No organizations exist - show empty state
  if (!isLoadingOrganizations && organizations.length === 0) {
    return (
      <MainLayout>
        <OrganizationEmptyState
          onOpenFormDialog={() => onEditOrganizationProfile()}
        />

        <OrganizationFormDialog
          open={formDialogOpen}
          onClose={closeFormDialog}
          mode="create"
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box className="flex flex-1 flex-col gap-6 p-6">
        <OrganizationHeader
          selectedOrganizationId={selectedOrganizationId}
          onOrganizationChange={setSelectedOrganizationId}
        />

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
              currentRole={selectedUserRole}
              userName={selectedUserName}
              isSubmitting={isUpdatingUser}
            />

            <DeleteUserConfirmationDialog
              open={deleteDialogOpen}
              onClose={closeDeleteUserDialog}
              onConfirm={handleDeleteUser}
              userName={selectedUserName}
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
