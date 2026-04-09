import { FC, useEffect, useRef } from "react";
import { Box, Typography, Button } from "@mui/material";
import { MainLayout } from "@/components/layout";
import {
  OrganizationProfileSection,
  OrganizationProfileSectionSkeleton,
  OrganizationHeader,
  OrganizationHeaderSkeleton,
  OrganizationUsersTable,
  OrganizationUsersTableSkeleton,
  OrganizationFormDialog,
  AddUserDialog,
  EditUserRoleDialog,
  DeleteUserConfirmationDialog,
} from "./components";
import {
  useMyOrganizationData,
  useMyOrganizationState,
  useMyOrganizationUsers,
} from "./hooks";
import { useMyOrganizations } from "@/api/query/organizations";
import { OrganizationDisplayStatusValues, OrganizationRole } from "@repo/types";
import { DialogMode } from "./types";
import { ScreenEmptyState } from "../../components";

export const MyOrganizationScreen: FC = () => {
  // Fetch user's organizations list
  const {
    data: organizations,
    isLoading: isLoadingOrganizations,
    error: organizationsError,
    refetch: refetchOrganizations,
  } = useMyOrganizations();

  // UI state management - simplified to just dialog state and selected org ID
  const {
    selectedOrganizationId,
    setSelectedOrganizationId,
    formDialogMode,
    formDialogOpen,
    openFormDialog,
    closeFormDialog,
    onEditOrganizationProfile,
  } = useMyOrganizationState();

  // Set default organization (first one) when organizations load
  // Use ref to prevent race condition when organizations array reference changes
  const hasSetInitialOrg = useRef(false);

  useEffect(() => {
    if (
      !isLoadingOrganizations &&
      organizations &&
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

  // TODO: in the future, fetch the current user's role in the organization directly from the API instead of deriving it from the users list
  const myUser = organizationUsers?.find((user) => user.isCurrentUser);
  const myOrganizationRole = myUser?.organizationRole;

  // User management
  const {
    addDialogOpen,
    editDialogOpen,
    deleteDialogOpen,
    selectedUserEmail,
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

  // Loading state
  if (isLoadingOrganizations) {
    return (
      <MainLayout>
        <Box className="flex flex-1 flex-col gap-6 p-6">
          <OrganizationHeaderSkeleton />
          <OrganizationProfileSectionSkeleton />
          <OrganizationUsersTableSkeleton />
        </Box>
      </MainLayout>
    );
  }

  // Error state
  if (organizationsError) {
    return (
      <MainLayout>
        <Box className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <Typography variant="h5" color="text.primary" fontWeight="bold">
            Hubo un error cargando tus organizaciones
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            className="max-w-[600px]"
          >
            {organizationsError instanceof Error
              ? organizationsError.message
              : "Por favor, intente nuevamente más tarde."}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => refetchOrganizations()}
            sx={{ mt: 2 }}
          >
            Reintentar
          </Button>
        </Box>
      </MainLayout>
    );
  }

  // No organizations exist - show empty state
  if (!organizations || organizations.length === 0) {
    return (
      <MainLayout>
        <ScreenEmptyState
          title="Aún no tienes organizaciones creadas"
          description="Haz clic en el botón para crear tu primera organización y comenzar a
            gestionar tu perfil, usuarios y huellas de carbono"
          action={{
            label: "Crear Organización",
            onClick: onEditOrganizationProfile,
          }}
        />
        <OrganizationFormDialog
          open={formDialogOpen}
          onClose={closeFormDialog}
          mode={DialogMode.create}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box className="flex flex-1 flex-col gap-6">
        <OrganizationHeader
          selectedOrganizationId={selectedOrganizationId}
          onOrganizationChange={setSelectedOrganizationId}
        />

        {organization ? (
          <>
            <OrganizationProfileSection
              profile={organization}
              onEdit={() =>
                openFormDialog(
                  organization.status ===
                    OrganizationDisplayStatusValues.ACCREDITED
                    ? DialogMode.accredited
                    : DialogMode.edit
                )
              }
              canManageOrganization={
                myOrganizationRole === OrganizationRole.ADMIN
              }
            />

            <OrganizationUsersTable
              users={organizationUsers ?? []}
              onAdd={openAddUserDialog}
              onEdit={openEditUserDialog}
              onDelete={openDeleteUserDialog}
              isLoading={isLoadingUsers}
              canManageUsers={myOrganizationRole === OrganizationRole.ADMIN}
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
              userEmail={selectedUserEmail}
              isSubmitting={isUpdatingUser}
            />

            <DeleteUserConfirmationDialog
              open={deleteDialogOpen}
              onClose={closeDeleteUserDialog}
              onConfirm={handleDeleteUser}
              userEmail={selectedUserEmail}
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
