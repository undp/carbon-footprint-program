import { FC, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useWatch } from "react-hook-form";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { Routes } from "@/interfaces";
import { useReductionProject } from "@/api/query/reductionProjects";
import { useMyOrganizations } from "@/api/query/organizations";
import {
  useCarbonInventoriesMinimalData,
  useCarbonInventory,
} from "@/api/query/carbonInventories";
import { useSubcategories } from "@/api/query/maintainer/useSubcategories";
import { ReductionProjectStatusChip } from "@/components/ReductionProjectStatusChip";
import {
  ReductionProjectLayout,
  type FooterButton,
} from "./layout/ReductionProjectLayout";
import { useReductionProjectForm } from "./hooks/useReductionProjectForm";
import { useReductionProjectSubmit } from "./hooks/useReductionProjectSubmit";
import { ReductionProjectFormFields } from "./components/ReductionProjectFormFields";
import { GeiConsideredSection } from "./components/GeiConsideredSection";
import { ReductionReportSection } from "./components/ReductionReportSection";
import { FileUploadSection } from "./components/FileUploadSection";

export const ReductionProjectScreen: FC = () => {
  const { id } = useParams({ from: Routes.REDUCTION_PROJECT });
  const navigate = useNavigate();

  // Queries
  const { data: project, isLoading, isError } = useReductionProject(id);
  const { data: organizations = [], isLoading: isLoadingOrgs } =
    useMyOrganizations();
  const { data: verifiedInventories = [] } = useCarbonInventoriesMinimalData([
    "VERIFICATION_APPROVED",
  ]);

  // Form
  const form = useReductionProjectForm({ project });
  const {
    control,
    handleSubmit,
    selectedOrganizationId,
    selectedCarbonInventoryId,
  } = form;

  // Derived: carbon inventory detail for methodology + year
  const { data: inventoryDetail } = useCarbonInventory(
    selectedCarbonInventoryId || ""
  );
  const methodologyVersionId = inventoryDetail?.methodologyVersionId
    ? String(inventoryDetail.methodologyVersionId)
    : undefined;
  const { data: subcategories = [], isLoading: isLoadingSubcategories } =
    useSubcategories(methodologyVersionId);

  // Derived state
  const status = project?.status;
  const isFormDisabled = status === "SUBMITTED" || status === "APPROVED";
  const isReviewed = status === "REVIEWED";
  const hasInventorySelected = !!selectedCarbonInventoryId;

  const projectName = useWatch({ control, name: "name" });

  const availableYears = useMemo(() => {
    if (!inventoryDetail?.year) return [];
    const currentYear = new Date().getFullYear();
    const startYear = inventoryDetail.year;
    const years: number[] = [];
    for (let y = startYear; y <= currentYear; y++) {
      years.push(y);
    }
    return years;
  }, [inventoryDetail?.year]);

  // Submit
  const { submit, isSubmitting } = useReductionProjectSubmit({
    projectId: id,
    status,
  });

  const goBack = () => {
    void navigate({ to: Routes.REDUCTION_PROJECTS });
  };

  // Footer buttons
  const backButton: FooterButton = {
    text: "Volver",
    align: "right",
    buttonProps: {
      startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
      onClick: goBack,
    },
  };

  const saveButton: FooterButton | undefined = isFormDisabled
    ? undefined
    : {
        text: isReviewed ? "Subir Cambios" : "Guardar Borrador",
        align: "right",
        buttonProps: {
          variant: "contained",
          type: "submit",
          form: "reduction-project-form",
          loading: isSubmitting,
        },
      };

  const footerButtons = [backButton, ...(saveButton ? [saveButton] : [])];

  return (
    <ReductionProjectLayout
      headerProps={{
        subtitle: projectName || undefined,
      }}
      footerProps={{ buttons: footerButtons }}
      isLoading={isLoading}
      hasError={isError}
    >
      <Box
        component="form"
        id="reduction-project-form"
        onSubmit={handleSubmit(submit)}
        className="flex flex-col gap-6 rounded-lg bg-white p-6"
      >
        {/* Content header with status chip */}
        <Box className="flex items-center justify-between">
          <Typography variant="body1" fontSize={18} fontWeight={500}>
            Proyecto de Reducción
          </Typography>
          {status && (
            <ReductionProjectStatusChip status={status} size="medium" />
          )}
        </Box>

        {/* Form fields */}
        <ReductionProjectFormFields
          control={control}
          disabled={isFormDisabled}
          organizations={organizations}
          isLoadingOrgs={isLoadingOrgs}
          verifiedInventories={verifiedInventories}
          selectedOrganizationId={selectedOrganizationId}
          subcategories={subcategories}
          isLoadingSubcategories={isLoadingSubcategories}
          hasInventorySelected={hasInventorySelected}
        />

        {/* GEI + Reported elsewhere */}
        <GeiConsideredSection control={control} disabled={isFormDisabled} />

        {/* Reduction report datagrid */}
        <ReductionReportSection
          control={control}
          disabled={isFormDisabled}
          projectName={projectName}
          availableYears={availableYears}
          hasInventorySelected={hasInventorySelected}
        />

        {/* File upload (REVIEWED only) */}
        {isReviewed && (
          <FileUploadSection control={control} disabled={isSubmitting} />
        )}
      </Box>
    </ReductionProjectLayout>
  );
};
