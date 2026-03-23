import { FC, useMemo, useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Route } from "@/routes/app/reduction-projects/add";
import { useForm } from "react-hook-form";
import { Box, Typography, Button, Divider } from "@mui/material";
import { Save, ArrowBack } from "@mui/icons-material";
import { InfoButton } from "@/components/InfoButton";
import { FormSelectField } from "@/components/form/FormSelectField";
import { Routes } from "@/interfaces";
import { AddReductionProjectFormData, GreenhouseGas, OrganizationInfo } from "./types";
import {
  useCreateReductionProject,
  useUpdateReductionProject,
  useReductionProject,
  useAddReductionProjectReport,
  useSubmitReductionProject,
  useOrganizations,
  useOrganization,
  useSubcategories,
} from "@/api/query";
import {
  OrganizationInfoSection,
  ProjectIdentificationForm,
  GeiConsideradosSection,
  ReportedInitiativeSection,
  ReductionReportSection,
  FileUploadSection,
} from "./components";

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

export const AddReductionProjectScreen: FC = () => {
  const navigate = useNavigate();
  const { orgId, projectId, viewOnly = false } = useSearch({ from: Route.fullPath });
  const isEditMode = !!projectId;
  const { data: organizations } = useOrganizations();

  const organizationOptions = useMemo(
    () =>
      (organizations ?? []).map((org) => ({ value: org.id, label: org.name })),
    [organizations]
  );

  const { data: subcategories = [] } = useSubcategories();
  const subcategoryOptions = useMemo(
    () => subcategories.map((s) => ({ value: s.id, label: s.name })),
    [subcategories]
  );

  const createProject = useCreateReductionProject();
  const updateProject = useUpdateReductionProject();
  const addReport = useAddReductionProjectReport();
  const submitProject = useSubmitReductionProject();

  const { data: existingProject } = useReductionProject(projectId ?? "");

  const { control, handleSubmit, watch, reset } =
    useForm<AddReductionProjectFormData>({
      defaultValues: {
        projectName: "",
        branch: orgId ?? "",
        implementationDate: "",
        emissionSubcategory: "",
        projectDescription: "",
        pcg: "",
        selectedGases: [],
        reportedInOtherInitiative: false,
        otherInitiativeDescription: "",
        reductionYear: "",
        baselineValue: "",
        projectValue: "",
      },
    });

  useEffect(() => {
    if (!existingProject) return;
    const firstReport = existingProject.reports?.[0];
    reset({
      projectName: existingProject.name,
      branch: existingProject.organizationId,
      implementationDate: existingProject.implementationDate ?? "",
      emissionSubcategory: existingProject.subcategoryId ?? "",
      projectDescription: existingProject.description ?? "",
      pcg: existingProject.pcg ?? "",
      selectedGases: existingProject.selectedGases as GreenhouseGas[],
      reportedInOtherInitiative: existingProject.reportedInOtherInitiative,
      otherInitiativeDescription: existingProject.otherInitiativeDescription ?? "",
      reductionYear: firstReport ? String(firstReport.reductionYear) : "",
      baselineValue: firstReport ? Number(firstReport.baselineValue) : "",
      projectValue: firstReport ? Number(firstReport.projectValue) : "",
    });
  }, [existingProject, reset]);

  const selectedOrgId = watch("branch");
  const effectiveOrgId = selectedOrgId || (organizations?.[0]?.id ?? "");

  const { data: orgDetails } = useOrganization(effectiveOrgId || undefined);

  const organizationInfo: OrganizationInfo | undefined = orgDetails
    ? {
        legalName: orgDetails.legalName,
        rut: orgDetails.taxId,
        legalRepresentative: orgDetails.representative?.fullName ?? "",
      }
    : undefined;

  const baselineValue = watch("baselineValue");
  const projectValue = watch("projectValue");

  const calculatedReduction =
    (Number(baselineValue) || 0) - (Number(projectValue) || 0);

  const mapFormToApi = (data: AddReductionProjectFormData) => ({
    organizationId: effectiveOrgId,
    name: data.projectName,
    description: data.projectDescription || undefined,
    organizationBranchId: undefined,
    implementationDate: data.implementationDate || undefined,
    subcategoryId: data.emissionSubcategory || undefined,
    pcg: data.pcg || undefined,
    selectedGases: data.selectedGases,
    reportedInOtherInitiative: data.reportedInOtherInitiative,
    otherInitiativeDescription:
      data.otherInitiativeDescription || undefined,
  });

  const mapFormToUpdateApi = (data: AddReductionProjectFormData) => ({
    name: data.projectName,
    description: data.projectDescription || undefined,
    implementationDate: data.implementationDate || undefined,
    subcategoryId: data.emissionSubcategory || undefined,
    pcg: data.pcg || undefined,
    selectedGases: data.selectedGases,
    reportedInOtherInitiative: data.reportedInOtherInitiative,
    otherInitiativeDescription:
      data.otherInitiativeDescription || undefined,
  });

  const addReportIfProvided = async (
    projectId: string,
    data: AddReductionProjectFormData
  ) => {
    const year = data.reductionYear ? parseInt(data.reductionYear, 10) : null;
    if (year) {
      await addReport.mutateAsync({
        id: projectId,
        data: {
          reductionYear: year,
          baselineValue: Number(data.baselineValue),
          projectValue: Number(data.projectValue),
        },
      });
    }
  };

  const handleSaveDraft = handleSubmit(async (data) => {
    try {
      if (isEditMode && projectId) {
        await updateProject.mutateAsync({ id: projectId, data: mapFormToUpdateApi(data) });
        await addReportIfProvided(projectId, data);
      } else {
        const created = await createProject.mutateAsync(mapFormToApi(data));
        await addReportIfProvided(created.id, data);
      }
      navigate({ to: Routes.REDUCTION_PROJECTS });
    } catch {
      // Error is handled by apiClient's afterResponse hook
    }
  });

  const handleBack = () => {
    navigate({ to: Routes.REDUCTION_PROJECTS });
  };

  const handleFormSubmit = async (data: AddReductionProjectFormData) => {
    try {
      if (isEditMode && projectId) {
        await updateProject.mutateAsync({ id: projectId, data: mapFormToUpdateApi(data) });
        await addReportIfProvided(projectId, data);
        await submitProject.mutateAsync(projectId);
      } else {
        const created = await createProject.mutateAsync(mapFormToApi(data));
        await addReportIfProvided(created.id, data);
        await submitProject.mutateAsync(created.id);
      }
      navigate({ to: Routes.REDUCTION_PROJECTS });
    } catch {
      // Error is handled by apiClient's afterResponse hook
    }
  };

  const isSaving =
    createProject.isPending || updateProject.isPending || addReport.isPending || submitProject.isPending;

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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" sx={{ fontSize: 18 }}>
                  Identificación de proyecto de Reducción
                </Typography>
                <InfoButton label="Información sobre identificación de proyecto" />
              </Box>
              {!viewOnly && (
                <Button
                  variant="outlined"
                  startIcon={<Save />}
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  sx={{
                    textTransform: "uppercase",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  Guardar Borrador
                </Button>
              )}
            </Box>

            {/* Organization Selector */}
            <FormSelectField
              name="branch"
              control={control}
              label="Organización"
              options={organizationOptions}
              required
              disabled={viewOnly}
            />

            {/* Organization Information */}
            {organizationInfo && (
              <OrganizationInfoSection organizationInfo={organizationInfo} />
            )}

            {/* Project Identification Form */}
            <ProjectIdentificationForm
              control={control}
              subcategories={subcategoryOptions}
              pcgOptions={mockPCGOptions}
              disabled={viewOnly}
            />

            <Divider sx={{ opacity: 0.2 }} />

            {/* GEI Considerados + Reportado en otra iniciativa - Side by side */}
            <Box className="flex flex-col gap-6 lg:flex-row">
              <Box className="flex-1">
                <GeiConsideradosSection control={control} disabled={viewOnly} />
              </Box>
              <Box className="flex-1">
                <ReportedInitiativeSection control={control} disabled={viewOnly} />
              </Box>
            </Box>

            <Divider sx={{ opacity: 0.2 }} />

            {/* Reduction Report Section */}
            <ReductionReportSection
              control={control}
              watch={watch}
              years={mockYears}
              calculatedReduction={calculatedReduction}
              disabled={viewOnly}
            />

            {/* File Upload Section */}
            <FileUploadSection />

            {/* Action Buttons */}
            {!viewOnly && (
              <Box className="flex justify-end gap-4 pt-4">
                <Button
                  variant="outlined"
                  startIcon={<Save />}
                  onClick={handleSaveDraft}
                  disabled={isSaving}
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
                  disabled={isSaving}
                  sx={{
                    textTransform: "uppercase",
                    fontSize: 12,
                    fontWeight: 500,
                    minWidth: 214,
                  }}
                >
                  {isSaving ? "Guardando..." : "Postular Sello Reducción"}
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
