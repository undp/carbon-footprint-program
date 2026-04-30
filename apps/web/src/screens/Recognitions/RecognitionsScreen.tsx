import { FC, useState, useMemo } from "react";
import { Box } from "@mui/material";
import { ScreenEmptyState } from "@/components";
import {
  useMyOrganizations,
  useOrganizationRecognitions,
  useCarbonInventoriesMinimalData,
} from "@/api/query";
import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";
import { useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { RecognitionsTable } from "./RecognitionsTable";
import { RecognitionScreenHeader } from "./RecognitionScreenHeader";
import { RecognitionsKpis } from "./RecognitionsKpis";
import { RECOGNITION_SUBMISSION_TYPES } from "@/utils/recognitions";

const APPROVED_STATUSES = [
  CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED,
  CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
];

const RECOGNITIONS_EXPLANATION_SLUGS = {
  MAIN: "recognitions",
} as const;

export const RecognitionsScreen: FC = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");

  const { data: organizations = [], isLoading: isLoadingOrgs } =
    useMyOrganizations();

  const defaultOrgId = organizations[0]?.id ?? "";
  const effectiveOrgId = selectedOrganizationId || defaultOrgId;

  const { data: recognitions = [], isLoading: isLoadingRecognitions } =
    useOrganizationRecognitions(
      effectiveOrgId,
      selectedYear || undefined,
      RECOGNITION_SUBMISSION_TYPES
    );

  const {
    data: approvedInventories = [],
    isLoading: isLoadingApprovedInventories,
  } = useCarbonInventoriesMinimalData(APPROVED_STATUSES);

  const availableYears = useMemo(() => {
    const orgInventories = approvedInventories.filter(
      (inv) => inv.organizationId === effectiveOrgId
    );
    const years = new Set(
      orgInventories.map((inv) => inv.year).filter((y) => y != null)
    );
    return Array.from(years).sort((a, b) => b - a);
  }, [approvedInventories, effectiveOrgId]);

  if (!isLoadingOrgs && organizations.length === 0) {
    return (
      <ScreenEmptyState
        title={`Aún no tienes ${VOCAB.organization.noun.plural} creadas`}
        description={`Haz clic en el botón para crear tu primera ${VOCAB.organization.noun.singular}.`}
        action={{
          label: `Ir a Mi ${capitalize(VOCAB.organization.noun.singular)}`,
          onClick: () => navigate({ to: Routes.MY_ORGANIZATION }),
        }}
      />
    );
  }

  if (!isLoadingApprovedInventories && availableYears.length === 0) {
    return (
      <ScreenEmptyState
        title="Aún no tienes huellas con reconocimientos"
        description="Haz clic en el botón para gestionar tus huellas"
        action={{
          label: "Ir a Mis Huellas",
          onClick: () => navigate({ to: Routes.CARBON_INVENTORIES }),
        }}
      />
    );
  }

  return (
    <Box className="flex flex-1 flex-col gap-6">
      <RecognitionScreenHeader
        organizations={organizations}
        isLoadingOrgs={isLoadingOrgs}
        selectedOrganizationId={effectiveOrgId}
        onOrganizationChange={setSelectedOrganizationId}
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />

      <RecognitionsKpis recognitions={recognitions} />

      <RecognitionsTable
        loading={isLoadingRecognitions}
        rows={recognitions}
        explanationSlug={RECOGNITIONS_EXPLANATION_SLUGS.MAIN}
      />
    </Box>
  );
};
