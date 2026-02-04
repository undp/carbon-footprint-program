import { FC, useState, useCallback } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { MainLayout } from "@/components/layout";
import {
  CompanyProfileSection,
  BranchesSection,
  UsersTableSection,
  CompanyAccreditationDialog,
  type CompanyAccreditationFormData,
} from "./components";

// Mock data matching Figma design
const MOCK_COMPANY_PROFILE = {
  name: "Cementera del Valle",
  rut: "76.458.320-1",
  legalName: "Cementera del Valle S.A.",
  sector: "Industria manufacturera – Producción de cemento y clinker",
  subSector: "Fabricación de cemento, cal y yeso (CIIU 2394)",
  size: "Empresa grande",
  mainActivity: "Producción y despacho de clinker y cemento",
  address: "Camino Industrial 2450, Tiltil, Región Metropolitana, Chile",
  region: "Metropolitana de Santiago",
  employeeCount: 620,
};

const MOCK_BRANCHES = [
  {
    id: "1",
    name: "Planta Tiltil",
    region: "Metropolitana de Santiago",
    type: "Planta principal",
  },
];

const MOCK_REPRESENTATIVE = {
  name: "Maria Fernanda Rivas Soto",
  rut: "13.984.562-3",
  position: "Gerenta de Sustentabilidad y Cumplimiento Ambiental",
  email: "mfrivas@cementeradelvalle.cl",
  phone: "+56 9 8354 8700",
};

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
  const [selectedBranch, setSelectedBranch] = useState(MOCK_BRANCHES[0].id);
  const [accreditationDialogOpen, setAccreditationDialogOpen] = useState(false);

  const handleEditProfile = useCallback(() => {
    setAccreditationDialogOpen(true);
  }, []);

  const handleAccreditationSubmit = useCallback(
    (data: CompanyAccreditationFormData) => {
      // TODO: Implement API call to save data
      setAccreditationDialogOpen(false);
      // eslint-disable-next-line no-console
      console.log("Form submitted:", data);
    },
    []
  );

  // TODO: Implement add branch modal
  const handleAddBranch = useCallback(() => undefined, []);

  // TODO: Implement edit branch modal
  const handleEditBranch = useCallback((_id: string) => undefined, []);

  // TODO: Implement add user modal
  const handleAddUser = useCallback(() => undefined, []);

  // TODO: Implement edit user modal
  const handleEditUser = useCallback((_id: string) => undefined, []);

  // TODO: Implement delete user confirmation
  const handleDeleteUser = useCallback((_id: string) => undefined, []);

  return (
    <MainLayout>
      <Box className="flex flex-1 flex-col gap-6 p-6">
        {/* Header with company name and branch selector */}
        <Box className="flex items-center justify-between rounded-lg bg-white p-4">
          <Typography variant="h5" fontWeight={700}>
            {MOCK_COMPANY_PROFILE.name}
          </Typography>
          {/* TODO: Implement branch selector */}
          {/* <FormControl sx={{ minHeight: 40, minWidth: 240 }} size="small">
            <InputLabel id="branch-select-label">Sede/sucursal</InputLabel>
            <Select
              labelId="branch-select-label"
              id="branch-select"
              value={selectedBranch}
              label="Sede/sucursal"
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {MOCK_BRANCHES.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl> */}
        </Box>

        {/* Company Profile Section */}
        <CompanyProfileSection
          profile={MOCK_COMPANY_PROFILE}
          representative={MOCK_REPRESENTATIVE}
          onEdit={handleEditProfile}
        />

        {/* Branches Section */}
        {/* <BranchesSection
          branches={MOCK_BRANCHES}
          onAdd={handleAddBranch}
          onEdit={handleEditBranch}
        /> */}

        {/* Users Table Section */}
        <UsersTableSection
          users={MOCK_USERS}
          onAdd={handleAddUser}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
        />
      </Box>

      {/* Company Accreditation Dialog */}
      <CompanyAccreditationDialog
        open={accreditationDialogOpen}
        onClose={() => setAccreditationDialogOpen(false)}
        onSubmit={handleAccreditationSubmit}
        mode="edit"
        initialData={{
          legalName: MOCK_COMPANY_PROFILE.legalName,
          commercialName: MOCK_COMPANY_PROFILE.name,
          taxId: MOCK_COMPANY_PROFILE.rut,
          address: MOCK_COMPANY_PROFILE.address,
          representativeName: MOCK_REPRESENTATIVE.name,
          representativeId: MOCK_REPRESENTATIVE.rut,
          representativePosition: MOCK_REPRESENTATIVE.position,
          representativePhone: MOCK_REPRESENTATIVE.phone,
        }}
      />
    </MainLayout>
  );
};
