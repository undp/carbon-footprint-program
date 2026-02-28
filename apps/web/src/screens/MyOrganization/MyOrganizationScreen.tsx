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
} from "./components";
import {
  useMyOrganizationData,
  useMyOrganizationState,
  useMyOrganizationForm,
  useMyOrganizationSubmit,
  useMyOrganizationUsers,
} from "./hooks";

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

  // Form data preparation
  const { initialData } = useMyOrganizationForm({ organization });

  // Submit handlers with close callback
  const { handleOrganizationCreation, handleOrganizationUpdate, isSubmitting } =
    useMyOrganizationSubmit({
      organizationId: organization?.id,
      onSuccess: closeFormDialog,
    });

  // User management (mock data for now)
  const { users, handleAddUser, handleEditUser, handleDeleteUser } =
    useMyOrganizationUsers();

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
              users={users}
              onAdd={handleAddUser}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
            />
            <OrganizationFormDialog
              open={formDialogOpen}
              onClose={closeFormDialog}
              onSubmit={handleOrganizationUpdate}
              mode={formDialogMode}
              isSubmitting={isSubmitting}
              initialData={initialData}
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
