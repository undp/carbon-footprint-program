import { FC, useEffect, useMemo } from "react";
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
import { useCarbonInventoryMethodology } from "@/api/query/carbonInventories/methodologies/useCarbonInventoryMethodology";
import { ReductionProjectStatusChip } from "@/components/ReductionProjectStatusChip";
import { InfoButton, ScreenEmptyState } from "@/components";
import { useExplanationDialog } from "@/contexts";
import { REDUCTION_PROJECT_EXPLANATION_SLUGS } from "./constants";
import {
  ReductionProjectLayout,
  type FooterButton,
} from "./layout/ReductionProjectLayout";
import { useReductionProjectForm } from "./hooks/useReductionProjectForm";
import { useReductionProjectSubmit } from "./hooks/useReductionProjectSubmit";
import { ReductionProjectFormFields } from "./components/ReductionProjectFormFields";
import { GeiConsideredSection } from "./components/GeiConsideredSection";
import { ReportedElsewhereSection } from "./components/ReportedElsewhereSection";
import { ReductionReportSection } from "./components/ReductionReportSection";
import { FileUploadSection } from "./components/FileUploadSection";
import {
  CarbonInventoryDisplayStatusEnum,
  ReductionProjectDisplayStatusEnum,
} from "@repo/types";
import { VOCAB } from "../../config/vocab";
import { capitalize } from "lodash-es";
import { useReductionProjectRouteGuard } from "./hooks/useReductionProjectRouteGuard";

interface Props {
  mode: "create" | "edit" | "view";
}

export const ReductionProjectScreen: FC<Props> = ({ mode }) => {
  const navigate = useNavigate();
  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit";
  const isViewMode = mode === "view";
  const params = useParams({
    from: isCreateMode
      ? Routes.REDUCTION_PROJECT_NEW
      : isEditMode
        ? Routes.REDUCTION_PROJECT_EDIT
        : Routes.REDUCTION_PROJECT_DETAILS,
  });

  const id = isCreateMode ? undefined : (params as { id: string }).id;

  const { openExplanationBySlug } = useExplanationDialog();

  // Queries
  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
  } = useReductionProject(id);
  const {
    data: organizations = [],
    isLoading: isLoadingOrgs,
    isError: isErrorOrgs,
  } = useMyOrganizations();
  const {
    data: verifiedInventories = [],
    isLoading: isLoadingInventories,
    isError: isErrorInventories,
  } = useCarbonInventoriesMinimalData([
    CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
  ]);

  // Derived state
  const isProjectInformationLoading =
    (isEditMode || isViewMode) && isProjectLoading;

  const isSelectorsLoading = isLoadingInventories || isLoadingOrgs;

  const isLoading = isProjectInformationLoading || isSelectorsLoading;

  const hasProjectInformationError =
    (isEditMode || isViewMode) && isProjectError;
  const hasSelectorsError = isErrorOrgs || isErrorInventories;
  const hasError = hasProjectInformationError || hasSelectorsError;

  const status = isEditMode || isViewMode ? project?.status : undefined;
  const isReviewed = status === ReductionProjectDisplayStatusEnum.REVIEWED;
  const showFileUpload = isCreateMode || (isReviewed && !isViewMode);

  // Form
  const form = useReductionProjectForm({ project, showFileUpload });
  const {
    control,
    handleSubmit,
    setValue,
    selectedOrganizationId,
    selectedCarbonInventoryId,
    formState: { isSubmitting: isFormSubmitting, isSubmitSuccessful },
  } = form;

  // Guard only fires in edit mode; view/create pass undefined so the hook is
  // a no-op and never redirects. Suppress it while submitting and after a
  // successful save: the mutation invalidates the access query and a status
  // transition (e.g. REVIEWED→SUBMITTED) would otherwise fire a stale
  // "no edit" snackbar before the screen unmounts.
  const { canEdit, mustNavigateAway } = useReductionProjectRouteGuard(
    isEditMode ? id : undefined,
    !isFormSubmitting && !isSubmitSuccessful
  );
  const isFormDisabled =
    isViewMode || (!isCreateMode && Boolean(status) && !canEdit);

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

  // In view mode the user may not be a member of the project's organization
  // (admin reviewing). The selector data sources (useMyOrganizations,
  // useCarbonInventoriesMinimalData) are scoped to the user's own data, so
  // the project's referenced entities may be missing from those lists.
  // Use the embedded `organization` and `carbonInventory` objects from the
  // project response as a single-element fallback so disabled selectors
  // render meaningful labels.
  const formOrganizations = useMemo(() => {
    if (!isViewMode || !project) return organizations;
    return [
      {
        id: project.organization.id,
        name:
          project.organization.name ??
          capitalize(VOCAB.organization.noun.singular),
      },
    ];
  }, [isViewMode, project, organizations]);

  const formVerifiedInventories = useMemo(() => {
    if (!isViewMode || !project) return verifiedInventories;
    return [
      {
        id: project.carbonInventory.id,
        organizationId: project.organization.id,
        organizationName: project.organization.name,
        name: project.carbonInventory.name,
        year: project.carbonInventory.year,
        status: CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
      },
    ];
  }, [isViewMode, project, verifiedInventories]);

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
        text: isCreateMode ? "Ingresar Proyecto" : "Subir Cambios",
        align: "right",
        buttonProps: {
          variant: "contained",
          type: "submit",
          form: "reduction-project-form",
          loading: isSubmitting,
          disabled:
            isSubmitting ||
            isLoading ||
            hasError ||
            organizations.length === 0 ||
            verifiedInventories.length === 0,
        },
      };

  const footerButtons = [backButton, ...(saveButton ? [saveButton] : [])];

  const layoutProps = {
    headerProps: {
      subtitle: projectName || undefined,
      explanationSlug: REDUCTION_PROJECT_EXPLANATION_SLUGS.MAIN,
    },
    footerProps: { buttons: footerButtons },
    isLoading,
    hasError,
  };

  if (hasError) {
    throw new Error("Error al cargar la información del proyecto de reducción");
  }

  if (
    !isViewMode &&
    !mustNavigateAway &&
    !isLoadingOrgs &&
    organizations.length === 0
  ) {
    return (
      <ReductionProjectLayout {...layoutProps}>
        <ScreenEmptyState
          title={`Sin ${VOCAB.organization.noun.plural} ${VOCAB.inscription.adjective.plural}`}
          description={`Recuerda ${VOCAB.inscription.verb.singular} tu ${VOCAB.organization.noun.singular} antes de ingresar un proyecto de reducción.`}
          action={{
            label: `Ir a Mi ${capitalize(VOCAB.organization.noun.singular)}`,
            onClick: () => void navigate({ to: Routes.MY_ORGANIZATION }),
          }}
        />
      </ReductionProjectLayout>
    );
  }

  if (
    !isViewMode &&
    !mustNavigateAway &&
    !isLoadingInventories &&
    verifiedInventories.length === 0
  ) {
    return (
      <ReductionProjectLayout {...layoutProps}>
        <ScreenEmptyState
          title="Sin huellas con reconocimiento de verificación"
          description="Debes tener al menos una huella con reconocimiento de verificación antes de poder ingresar un proyecto de reducción."
          action={{
            label: `Ir a Huella ${capitalize(VOCAB.organization.relationalAdjective)}`,
            onClick: () => void navigate({ to: Routes.CARBON_INVENTORIES }),
          }}
        />
      </ReductionProjectLayout>
    );
  }

  return (
    <ReductionProjectLayout {...layoutProps}>
      <Box
        component="form"
        noValidate
        id="reduction-project-form"
        onSubmit={handleSubmit(submit)}
        className="flex min-h-0 flex-col gap-6 overflow-y-auto rounded-lg bg-white p-6"
      >
        {/* Content header with status chip */}
        <Box className="flex items-center justify-between">
          <Box className="flex items-center gap-1">
            <Typography variant="body1" fontSize={18}>
              Datos base
            </Typography>
            <InfoButton
              label="Más información"
              onClick={() =>
                openExplanationBySlug(REDUCTION_PROJECT_EXPLANATION_SLUGS.BASIS)
              }
            />
          </Box>
          {(isEditMode || isViewMode) && status && (
            <ReductionProjectStatusChip status={status} size="medium" />
          )}
        </Box>

        {/* Form fields */}
        <ReductionProjectFormFields
          control={control}
          disabled={isFormDisabled}
          organizations={formOrganizations}
          isLoadingOrgs={isLoadingOrgs}
          verifiedInventories={formVerifiedInventories}
          isLoadingInventories={isLoadingInventories}
          selectedOrganizationId={selectedOrganizationId}
          subcategories={subcategories}
          isLoadingSubcategories={isLoadingSubcategories}
          hasInventorySelected={hasInventorySelected}
          gwpExplanationSlug={REDUCTION_PROJECT_EXPLANATION_SLUGS.GWP}
        />

        {/* GEI + Reported elsewhere */}
        <Box className="flex flex-row gap-6">
          <GeiConsideredSection
            control={control}
            disabled={isFormDisabled}
            geiExplanationSlug={
              REDUCTION_PROJECT_EXPLANATION_SLUGS.GEI_CONSIDERED
            }
          />
          <ReportedElsewhereSection
            control={control}
            disabled={isFormDisabled}
            reportedElsewhereExplanationSlug={
              REDUCTION_PROJECT_EXPLANATION_SLUGS.REPORTED_ELSEWHERE
            }
          />
        </Box>

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
