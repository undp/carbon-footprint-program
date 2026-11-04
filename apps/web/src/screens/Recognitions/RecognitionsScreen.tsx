import { FC, useEffect, useState, useMemo } from "react";
import { Box } from "@mui/material";
import { useSnackbar } from "notistack";
import { ScreenEmptyState } from "@/components";
import { useMyOrganizations, useOrganizationRecognitions } from "@/api/query";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";
import { useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { RecognitionsTable } from "./RecognitionsTable";
import { RecognitionScreenHeader } from "./RecognitionScreenHeader";
import { RecognitionsKpis } from "./RecognitionsKpis";
import { RECOGNITION_SUBMISSION_TYPES } from "@/utils/recognitions";
import { getRecognitionYears } from "./utils/recognitionYears";

const RECOGNITIONS_EXPLANATION_SLUGS = {
  MAIN: "recognitions",
} as const;

export const RecognitionsScreen: FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");

  const { data: organizations = [], isLoading: isLoadingOrgs } =
    useMyOrganizations();

  const defaultOrgId = organizations[0]?.id ?? "";
  const effectiveOrgId = selectedOrganizationId || defaultOrgId;

  // Fetched once per organization across all years: the year selector and the
  // empty state are derived from this list, and the year filter runs on it.
  const {
    data: recognitions = [],
    isPending: isPendingRecognitions,
    isError: isErrorRecognitions,
  } = useOrganizationRecognitions(effectiveOrgId, RECOGNITION_SUBMISSION_TYPES);

  useEffect(() => {
    if (isErrorRecognitions) {
      enqueueSnackbar("Error al cargar los reconocimientos", {
        variant: "error",
      });
    }
  }, [isErrorRecognitions, enqueueSnackbar]);

  const availableYears = useMemo(
    () => getRecognitionYears(recognitions),
    [recognitions]
  );

  // Guards against a selected year that a refetch no longer returns: the
  // selector falls back to all years instead of showing a blank value.
  const effectiveYear = availableYears.includes(Number(selectedYear))
    ? selectedYear
    : "";

  const visibleRecognitions = useMemo(
    () =>
      effectiveYear
        ? recognitions.filter(
            (r) => r.measurementYear === Number(effectiveYear)
          )
        : recognitions,
    [recognitions, effectiveYear]
  );

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

  // Switching organization starts again from all years.
  const handleOrganizationChange = (organizationId: string) => {
    setSelectedOrganizationId(organizationId);
    setSelectedYear("");
  };

  // `isPending`, not `isLoading`: while the organizations load the query is
  // disabled, and a disabled query reports `isLoading: false`. A failed request
  // is not "no recognitions": the snackbar reports it instead.
  const hasNoRecognitions =
    !isLoadingOrgs &&
    !isPendingRecognitions &&
    !isErrorRecognitions &&
    recognitions.length === 0;

  return (
    <Box className="flex flex-1 flex-col gap-6">
      <RecognitionScreenHeader
        organizations={organizations}
        isLoadingOrgs={isLoadingOrgs}
        selectedOrganizationId={effectiveOrgId}
        onOrganizationChange={handleOrganizationChange}
        availableYears={availableYears}
        selectedYear={effectiveYear}
        onYearChange={setSelectedYear}
      />

      {hasNoRecognitions ? (
        <ScreenEmptyState
          title="Aún no tienes huellas con reconocimientos"
          description="Haz clic en el botón para gestionar tus huellas"
          action={{
            label: "Ir a Mis Huellas",
            onClick: () => navigate({ to: Routes.CARBON_INVENTORIES }),
          }}
        />
      ) : (
        <>
          <RecognitionsKpis recognitions={visibleRecognitions} />

          <RecognitionsTable
            loading={isPendingRecognitions}
            rows={visibleRecognitions}
            explanationSlug={RECOGNITIONS_EXPLANATION_SLUGS.MAIN}
          />
        </>
      )}
    </Box>
  );
};
