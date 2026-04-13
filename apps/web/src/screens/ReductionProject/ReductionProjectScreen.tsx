import { FC, useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useWatch } from "react-hook-form";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { Routes } from "@/interfaces";
import { useReductionProject } from "@/api/query/reductionProjects";
import { useMyOrganizations } from "@/api/query/organizations";
import {
  useCarbonInventoriesMinimalData,
  useCarbonInventory,
} from "@/api/query/carbonInventories";
import { useCarbonInventoryMethodology } from "@/api/query/carbonInventories/methodologies/useCarbonInventoryMethodology";
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
import {
  CarbonInventoryDisplayStatusEnum,
  ReductionProjectDisplayStatusEnum,
} from "@repo/types";

interface Props {
  mode: "create" | "edit";
  id?: string;
}

export const ReductionProjectScreen: FC<Props> = ({ mode, id }) => {
  const navigate = useNavigate();

  // Queries
  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
  } = useReductionProject(id);
  const { data: organizations = [], isLoading: isLoadingOrgs } =
    useMyOrganizations();
  const { data: verifiedInventories = [] } = useCarbonInventoriesMinimalData([
    CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
  ]);

  // Derived state
  const isLoading = mode === "edit" ? isProjectLoading : false;
  const hasError = mode === "edit" ? isProjectError : false;
  const status = mode === "edit" ? project?.status : undefined;
  const isFormDisabled =
    status === ReductionProjectDisplayStatusEnum.SUBMITTED ||
    status === ReductionProjectDisplayStatusEnum.APPROVED;
  const isReviewed = status === ReductionProjectDisplayStatusEnum.REVIEWED;
  const showFileUpload = mode === "create" || isReviewed;

  // Form
  const form = useReductionProjectForm({ project, showFileUpload });
  const {
    control,
    handleSubmit,
    setValue,
    selectedOrganizationId,
    selectedCarbonInventoryId,
  } = form;

  // Derived: carbon inventory detail for methodology + year
  const { data: inventoryDetail } = useCarbonInventory(
    selectedCarbonInventoryId || ""
  );
  const { data: methodology, isLoading: isLoadingSubcategories } =
    useCarbonInventoryMethodology(selectedCarbonInventoryId || "");
  const subcategories = useMemo(
    () => methodology?.categories.flatMap((cat) => cat.subcategories) ?? [],
    [methodology]
  );

  const hasInventorySelected = !!selectedCarbonInventoryId;

  const projectName = useWatch({ control, name: "name" });

  useEffect(() => {
    if (inventoryDetail?.year) {
      setValue("year", inventoryDetail.year);
    }
  }, [inventoryDetail?.year, setValue]);

  // Submit
  const { submit, isSubmitting } = useReductionProjectSubmit({
    projectId: id,
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
        text: mode === "create" ? "Ingresar Proyecto" : "Subir Cambios",
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
      hasError={hasError}
    >
      <Box
        component="form"
        id="reduction-project-form"
        onSubmit={handleSubmit(submit)}
        className="flex min-h-0 flex-col gap-6 overflow-y-auto rounded-lg bg-white p-6"
      >
        {/* Content header with status chip */}
        <Box className="flex items-center justify-between">
          <Typography variant="body1" fontSize={18} fontWeight={500}>
            Proyecto de Reducción
          </Typography>
          {mode === "edit" && status && (
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
          gwpExplanationId={null}
        />

        {/* GEI + Reported elsewhere */}
        <GeiConsideredSection
          control={control}
          disabled={isFormDisabled}
          geiExplanationId={null}
          reportedElsewhereExplanationId={null}
        />

        {/* Reduction report datagrid */}
        <ReductionReportSection
          control={control}
          disabled={isFormDisabled}
          projectName={projectName}
        />

        {/* File upload — visible in create mode and when REVIEWED */}
        {showFileUpload && (
          <FileUploadSection control={control} disabled={isSubmitting} />
        )}
      </Box>
    </ReductionProjectLayout>
  );
};
