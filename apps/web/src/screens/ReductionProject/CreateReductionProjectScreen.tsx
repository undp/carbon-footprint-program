import { FC, useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useWatch } from "react-hook-form";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { Routes } from "@/interfaces";
import { useMyOrganizations } from "@/api/query/organizations";
import {
  useCarbonInventoriesMinimalData,
  useCarbonInventory,
} from "@/api/query/carbonInventories";
import { useCarbonInventoryMethodology } from "@/api/query/carbonInventories/methodologies/useCarbonInventoryMethodology";
import {
  ReductionProjectLayout,
  type FooterButton,
} from "./layout/ReductionProjectLayout";
import { useReductionProjectForm } from "./hooks/useReductionProjectForm";
import { useCreateReductionProjectSubmit } from "./hooks/useCreateReductionProjectSubmit";
import { ReductionProjectFormFields } from "./components/ReductionProjectFormFields";
import { GeiConsideredSection } from "./components/GeiConsideredSection";
import { ReductionReportSection } from "./components/ReductionReportSection";
import { FileUploadSection } from "./components/FileUploadSection";
import { CarbonInventoryDisplayStatusEnum } from "@repo/types";

export const CreateReductionProjectScreen: FC = () => {
  const navigate = useNavigate();

  const { data: organizations = [], isLoading: isLoadingOrgs } =
    useMyOrganizations();
  const { data: verifiedInventories = [] } = useCarbonInventoriesMinimalData([
    CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
  ]);

  // Form initializes with empty default values (no existing project)
  const {
    control,
    handleSubmit,
    setValue,
    selectedOrganizationId,
    selectedCarbonInventoryId,
  } = useReductionProjectForm();

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

  const { submit, isSubmitting } = useCreateReductionProjectSubmit();

  const goBack = () => {
    void navigate({ to: Routes.REDUCTION_PROJECTS });
  };

  const footerButtons: FooterButton[] = [
    {
      text: "Volver",
      align: "right",
      buttonProps: {
        startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
        onClick: goBack,
      },
    },
    {
      text: "Ingresar Proyecto",
      align: "right",
      buttonProps: {
        variant: "contained",
        type: "submit",
        form: "reduction-project-form",
        loading: isSubmitting,
      },
    },
  ];

  return (
    <ReductionProjectLayout
      headerProps={{ subtitle: projectName || undefined }}
      footerProps={{ buttons: footerButtons }}
      isLoading={false}
      hasError={false}
    >
      <Box
        component="form"
        id="reduction-project-form"
        onSubmit={handleSubmit(submit)}
        className="flex flex-col gap-6 rounded-lg bg-white p-6"
      >
        <Box className="flex items-center justify-between">
          <Typography variant="body1" fontSize={18} fontWeight={500}>
            Proyecto de Reducción
          </Typography>
        </Box>

        <ReductionProjectFormFields
          control={control}
          disabled={false}
          organizations={organizations}
          isLoadingOrgs={isLoadingOrgs}
          verifiedInventories={verifiedInventories}
          selectedOrganizationId={selectedOrganizationId}
          subcategories={subcategories}
          isLoadingSubcategories={isLoadingSubcategories}
          hasInventorySelected={hasInventorySelected}
        />

        <GeiConsideredSection control={control} disabled={false} />

        <ReductionReportSection
          control={control}
          disabled={false}
          projectName={projectName}
        />

        {/* File upload — always shown and required for create */}
        <FileUploadSection control={control} disabled={isSubmitting} />
      </Box>
    </ReductionProjectLayout>
  );
};
