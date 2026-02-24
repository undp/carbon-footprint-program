import { FC, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Box, Typography, Button, Divider, IconButton } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { MainLayout } from "@/components/layout";
import { PageHeader, ProjectsTable, ApplicationsTable } from "./components";
import { ReductionProject, SealApplication, Branch } from "./types";
import { Routes } from "@/interfaces";

// Mock data matching Figma design
const mockProjects: ReductionProject[] = [
  {
    id: "1",
    name: "Sustitucion parcial de clinker por puzolana natural",
    implementationDate: "05-10-2025",
    firstReportDate: "09-10-2025",
    reductionTCO2e: 12500,
    yearsReported: 1,
  },
  {
    id: "2",
    name: "Cambio a combustibles alternativos en hornos de proceso",
    implementationDate: "05-10-2025",
    firstReportDate: "09-10-2025",
    reductionTCO2e: 8300,
    yearsReported: 1,
  },
  {
    id: "3",
    name: "Optimizacion energetica en molienda y ventilacion",
    implementationDate: "05-10-2025",
    firstReportDate: "09-10-2025",
    reductionTCO2e: 2300,
    yearsReported: 1,
  },
];

const mockApplications: SealApplication[] = [
  {
    id: "1",
    reductionYear: 2023,
    applicationDate: "10/10/2024",
    sealName: "Sello Huella Latam\nReduccion",
    status: "APPROVED",
  },
];

const mockBranches: Branch[] = [
  { id: "1", name: "Planta Tiltil" },
  { id: "2", name: "Planta Santiago" },
  { id: "3", name: "Oficina Central" },
];

const mockYears = ["2024", "2023", "2022", "2021"];

export const ReductionProjectsScreen: FC = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedBranch, setSelectedBranch] = useState("1");

  const handleYearChange = setSelectedYear;
  const handleBranchChange = setSelectedBranch;

  const handleEditProject = (_project: ReductionProject) => {
    // TODO: Implement edit project navigation
  };

  const handleDownloadProject = (_project: ReductionProject) => {
    // TODO: Implement project download
  };

  const handleDownloadApplication = (_application: SealApplication) => {
    // TODO: Implement application download
  };

  const handleApplyForSeal = () => {
    // TODO: Implement seal application flow
  };

  const handleAddProject = () => {
    navigate({ to: Routes.ADD_REDUCTION_PROJECT });
  };

  return (
    <MainLayout>
      <Box className="flex flex-1 flex-col gap-6 p-6">
        <PageHeader
          organizationName="Cementera del Valle"
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          years={mockYears}
          selectedBranch={selectedBranch}
          onBranchChange={handleBranchChange}
          branches={mockBranches}
        />

        <Box className="flex flex-col gap-8 rounded-lg bg-white p-4">
          {/* Reduction Projects Section */}
          <Box className="flex flex-col gap-4">
            <Box className="flex items-center justify-between">
              <Box className="flex items-center gap-1">
                <Typography
                  variant="body1"
                  sx={{ color: "text.primary", fontSize: "1.125rem" }}
                >
                  Proyectos de reduccion
                </Typography>
                <IconButton size="small">
                  <InfoOutlined sx={{ fontSize: 20, color: "primary.main" }} />
                </IconButton>
              </Box>

              <Box className="flex items-center gap-6">
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleApplyForSeal}
                  sx={{
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                  }}
                >
                  Postular a sello de reduccion
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddProject}
                  sx={{
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                  }}
                >
                  Ingresar proyecto de reduccion
                </Button>
              </Box>
            </Box>

            <ProjectsTable
              projects={mockProjects}
              onEdit={handleEditProject}
              onDownload={handleDownloadProject}
            />
          </Box>

          <Divider />

          {/* Applications Section */}
          <Box className="flex flex-col gap-4">
            <Typography
              variant="body1"
              sx={{ color: "text.primary", fontSize: "1.125rem" }}
            >
              Listado de postulaciones
            </Typography>

            <ApplicationsTable
              applications={mockApplications}
              onDownload={handleDownloadApplication}
            />
          </Box>
        </Box>
      </Box>
    </MainLayout>
  );
};
