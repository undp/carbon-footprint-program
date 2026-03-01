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
  useMyOrganizationForm,
  useMyOrganizationSubmit,
  useMyOrganizationUsers,
} from "./hooks";
import { useOrganizationUsers } from "@/api/query/organizations";

export const MyOrganizationScreen: FC = () => {
  // UI state management
  const {
    activeOrganizationId,
    formDialogMode,
    formDialogOpen,
    handleOrganizationChange,
    closeFormDialog,
    onEditOrganizationProfile,
  } = useMyOrganizationState();

  // Data fetching
  const { organization } = useMyOrganizationData({ activeOrganizationId });

  // Fetch organization users
  const { data: usersData, isLoading: usersLoading } = useOrganizationUsers(
    organization?.id ?? ""
  );

  // Form data preparation
  const { initialData } = useMyOrganizationForm({ organization });

  // Submit handlers with close callback
  const { handleOrganizationCreation, handleOrganizationUpdate, isSubmitting } =
    useMyOrganizationSubmit({
      organizationId: organization?.id,
      onSuccess: closeFormDialog,
    });

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
  } = useMyOrganizationUsers(organization?.id ?? "");

  // No organizations exist
  if (activeOrganizationId === null) {
    return (
      <MainLayout>
        <OrganizationEmptyState
          handleOrganizationCreation={handleOrganizationCreation}
        />
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
              representative={organization.representative}
              onEdit={onEditOrganizationProfile}
            />

            <OrganizationUsersTable
              users={usersData?.users ?? []}
              onAdd={openAddUserDialog}
              onEdit={openEditUserDialog}
              onDelete={openDeleteUserDialog}
              isLoading={usersLoading}
            />

            <OrganizationFormDialog
              open={formDialogOpen}
              onClose={closeFormDialog}
              onSubmit={handleOrganizationUpdate}
              mode={formDialogMode}
              isSubmitting={isSubmitting}
              initialData={initialData}
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
