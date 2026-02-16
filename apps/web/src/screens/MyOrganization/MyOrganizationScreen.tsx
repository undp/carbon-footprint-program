import { FC, useState, useCallback } from "react";
import { Box } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout";
import {
  CompanyProfileSection,
  CompanyProfileSectionSkeleton,
  OrganizationHeader,
  UsersTableSection,
  UsersTableSectionSkeleton,
  OrganizationFormDialog,
} from "./components";
import {
  useOrganization,
  organizationKeys,
} from "../../api/query/organizations";
import { NewOrganizationSection } from "./components/NewOrganizationSection";
import { CreateOrganizationBody } from "../../api/query/organizations/useCreateOrganization";

// Mock data matching Figma design
const MOCK_USERS = [
  {
    id: "1",
    fullName: "Juan Pablo Morales",
    email: "jpmorales@cementeradelvalle.cl",
    role: "Admin",
  },
  {
    id: "2",
    fullName: "Camila Fuentes Rojas",
    email: "cfuentes@cementeradelvalle.cl",
    role: "Editor",
  },
  {
    id: "3",
    fullName: "Rodrigo Alarcon Vega",
    email: "ralarcon@cementeradelvalle.cl",
    role: "Lector",
  },
];

export const MyOrganizationScreen: FC = () => {
  const queryClient = useQueryClient();

  // undefined = orgs loading, null = no orgs, string = selected org ID
  const [activeOrganizationId, setActiveOrganizationId] = useState<
    string | null
  >();

  const { data: organization } = useOrganization(activeOrganizationId ?? "");

  const [formDialogMode, setFormDialogMode] = useState<
    "create" | "edit" | "accreditation"
  >("accreditation");

  const [formDialogOpen, setFormDialogOpen] = useState(false);

  const handleOrganizationChange = useCallback(
    (organizationId: string | null) => {
      setActiveOrganizationId(organizationId);
    },
    []
  );

  const onEditOrganizationProfile = useCallback(() => {
    setFormDialogOpen(true);
    setFormDialogMode("edit");
  }, []);

  const handleOrganizationCreation = useCallback(
    (data: CreateOrganizationBody) => {
      setFormDialogOpen(false);
      // eslint-disable-next-line no-console
      console.log("Organization creation data submitted:", data);
      void queryClient.invalidateQueries({
        queryKey: organizationKeys.all,
      });
    },
    [queryClient]
  );

  const handleAccreditationSubmit = useCallback(
    (data: CreateOrganizationBody) => {
      // TODO: Implement API call to save data
      setFormDialogOpen(false);
      // eslint-disable-next-line no-console
      console.log("Form submitted:", data);
    },
    []
  );

  // TODO: Implement add user modal
  const handleAddUser = useCallback(() => undefined, []);

  // TODO: Implement edit user modal
  const handleEditUser = useCallback((_id: string) => undefined, []);

  // TODO: Implement delete user confirmation
  const handleDeleteUser = useCallback((_id: string) => undefined, []);

  // No organizations exist
  if (activeOrganizationId === null) {
    return (
      <MainLayout>
        <NewOrganizationSection
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
            <CompanyProfileSection
              profile={organization}
              representative={organization.representative}
              onEdit={onEditOrganizationProfile}
            />

            <UsersTableSection
              users={MOCK_USERS}
              onAdd={handleAddUser}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
            />
            <OrganizationFormDialog
              open={formDialogOpen}
              onClose={() => setFormDialogOpen(false)}
              onSubmit={handleAccreditationSubmit}
              mode={formDialogMode}
              initialData={{
                legalName: organization?.legalName,
                tradeName: organization?.tradeName,
                taxId: organization?.rut,
                address: organization?.address,
                sectorId: organization?.sector.id,
                subsectorId: organization?.subsector.id,
                countryOrganizationSizeId:
                  organization?.countryOrganizationSize.id,
                mainActivityId: organization?.mainActivity.id,
                employeeCount: organization?.employeeCount.toString(),
                representativeName: organization?.representative.name,
                representativeId: organization?.representative.taxId,
                representativePositionId:
                  organization?.representative.position.id,
                representativePhone: organization?.representative.phone,
              }}
            />
          </>
        ) : (
          <>
            <CompanyProfileSectionSkeleton />
            <UsersTableSectionSkeleton />
          </>
        )}
      </Box>
    </MainLayout>
  );
};
