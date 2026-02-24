import { FC } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { Box, Typography, Button, Divider } from "@mui/material";
import { Save, ArrowBack } from "@mui/icons-material";
import { InfoButton } from "@/components/InfoButton";
import { Routes } from "@/interfaces";
import { AddReductionProjectFormData } from "./types";
import {
  OrganizationInfoSection,
  ProjectIdentificationForm,
  GeiConsideradosSection,
  ReportedInitiativeSection,
  ReductionReportSection,
  FileUploadSection,
} from "./components";

// Mock data - will be replaced with API calls
const mockBranches = [
  { value: "1", label: "Planta Tiltil" },
  { value: "2", label: "Planta Santiago" },
  { value: "3", label: "Oficina Central" },
];

const mockSubcategories = [
  { value: "1", label: "Combustión estacionaria" },
  { value: "2", label: "Transporte" },
  { value: "3", label: "Energía eléctrica" },
];

const mockPCGOptions = [
  { value: "AR5", label: "AR5 (2014)" },
  { value: "AR4", label: "AR4 (2007)" },
  { value: "SAR", label: "SAR (1996)" },
];

const currentYear = new Date().getFullYear();
const mockYears = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

const organizationInfo = {
  legalName: "CEMENTERA DEL VALLE",
  rut: "76.458.320-1",
  legalRepresentative: "Rodrigo Ignacio Paredes Valdés",
};

export const AddReductionProjectScreen: FC = () => {
  const navigate = useNavigate();

  const { control, handleSubmit, watch } =
    useForm<AddReductionProjectFormData>({
      defaultValues: {
        projectName: "",
        branch: "",
        implementationDate: "",
        emissionSubcategory: "",
        projectDescription: "",
        pcg: "",
        selectedGases: [],
        reportedInOtherInitiative: false,
        otherInitiativeDescription: "",
        reductionYear: "",
        baselineValue: 0,
        projectValue: 0,
      },
    });

  const baselineValue = watch("baselineValue");
  const projectValue = watch("projectValue");

  const calculatedReduction =
    (Number(baselineValue) || 0) - (Number(projectValue) || 0);

  const handleSaveDraft = () => {
    // TODO: Implement save draft functionality
  };

  const handleBack = () => {
    navigate({ to: Routes.REDUCTION_PROJECTS });
  };

  const handleFormSubmit = (data: AddReductionProjectFormData) => {
    // TODO: Implement form submission
    void data;
  };

  return (
    <Box className="flex h-screen flex-1 overflow-y-auto px-6 py-6">
      <Box className="flex flex-1 flex-col gap-6">
        {/* Header */}
        <Box className="flex items-center gap-4">
          <Button
            onClick={handleBack}
            startIcon={<ArrowBack />}
            sx={{ color: "text.primary" }}
          >
            Volver
          </Button>
          <Typography variant="h5" sx={{ color: "text.primary" }}>
            Postulación Sello Reducción
          </Typography>
        </Box>

        {/* Main Content */}
        <Box className="mx-auto w-full max-w-7xl">
          <Box
            className="flex flex-col gap-4 rounded-lg p-4"
            sx={{ bgcolor: "background.paper", backdropFilter: "blur(5px)" }}
          >
            {/* Title and Save Draft Button */}
            <Box className="flex h-10 items-center justify-between">
              <Box className="flex items-center gap-2">
                <Typography variant="body1" sx={{ fontSize: 18 }}>
                  Identificación de proyecto de Reducción
                </Typography>
                <InfoButton label="Información sobre identificación de proyecto" />
              </Box>
              <Button
                variant="outlined"
                startIcon={<Save />}
                onClick={handleSaveDraft}
                sx={{
                  textTransform: "uppercase",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Guardar Borrador
              </Button>
            </Box>

            {/* Organization Information */}
            <OrganizationInfoSection organizationInfo={organizationInfo} />

            {/* Project Identification Form */}
            <ProjectIdentificationForm
              control={control}
              branches={mockBranches}
              subcategories={mockSubcategories}
              pcgOptions={mockPCGOptions}
            />

            <Divider sx={{ opacity: 0.2 }} />

            {/* GEI Considerados + Reportado en otra iniciativa - Side by side */}
            <Box className="flex flex-col gap-6 lg:flex-row">
              <Box className="flex-1">
                <GeiConsideradosSection control={control} />
              </Box>
              <Box className="flex-1">
                <ReportedInitiativeSection control={control} />
              </Box>
            </Box>

            <Divider sx={{ opacity: 0.2 }} />

            {/* Reduction Report Section */}
            <ReductionReportSection
              control={control}
              watch={watch}
              years={mockYears}
              calculatedReduction={calculatedReduction}
            />

            {/* File Upload Section */}
            <FileUploadSection />

            {/* Action Buttons */}
            <Box className="flex justify-end gap-4 pt-4">
              <Button
                variant="outlined"
                startIcon={<Save />}
                onClick={handleSaveDraft}
                sx={{
                  textTransform: "uppercase",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Guardar Borrador
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit(handleFormSubmit)}
                sx={{
                  textTransform: "uppercase",
                  fontSize: 12,
                  fontWeight: 500,
                  minWidth: 214,
                }}
              >
                Postular Sello Reducción
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
