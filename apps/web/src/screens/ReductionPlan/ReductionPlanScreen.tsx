import { FC, useEffect, useMemo, useState, useCallback } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { Download } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { useCarbonInventoriesMinimalData, useReductionPlan } from "@/api/query";
import { useMyOrganizations } from "@/api/query/organizations";
import { exportReductionPlanToExcel } from "@/utils/exportReductionPlanToExcel";
import { ExplanationProvider } from "@/contexts/ExplanationContext";
import { CategoryCarousel } from "@/screens/CarbonInventory/components/CategoryCarousel";
import { LoadingErrorStateMessage } from "@/components/EmissionResults/LoadingErrorStateMessage";
import { EmptyStateMessage } from "@/components/EmissionResults/EmptyStateMessage";
import { ScreenEmptyState } from "@/components/ScreenEmptyState";
import { Routes } from "@/interfaces/routes/routes.const";
import { ReductionPlanHeader } from "./components/ReductionPlanHeader";
import { SubcategoryInitiativeGroup } from "./components/SubcategoryInitiativeGroup";
import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import { VOCAB } from "@/config/vocab";
import { getRouteApi } from "@tanstack/react-router";

export const ReductionPlanScreen: FC = () => {
  const navigate = useNavigate();

  const Route = getRouteApi(Routes.REDUCTION_PLAN);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  const {
    carbonInventoryId: selectedCarbonInventoryId,
    organizationId: selectedOrganizationId,
  } = Route.useSearch();

  const {
    data: organizations,
    isLoading: isLoadingOrganizations,
    isError: isErrorOrganizations,
  } = useMyOrganizations();

  const {
    data: inventories,
    isLoading: isLoadingInventories,
    isError: isErrorInventories,
  } = useCarbonInventoriesMinimalData(
    Object.values(CarbonInventoryDisplayStatusEnum).filter(
      (status) => status !== CarbonInventoryDisplayStatusEnum.DELETED
    )
  );

  const onOrganizationChange = useCallback(
    (orgId: string) => {
      void navigate({
        to: Routes.REDUCTION_PLAN,
        replace: true,
        search: (prev) => ({
          ...prev,
          organizationId: orgId,
          carbonInventoryId: undefined,
        }),
      });
    },
    [navigate]
  );

  const onCarbonInventoryChange = useCallback(
    (inventoryId: string) => {
      void navigate({
        to: Routes.REDUCTION_PLAN,
        search: (prev) => ({
          ...prev,
          carbonInventoryId: inventoryId,
        }),
      });
    },
    [navigate]
  );

  const matchesOrg = useCallback(
    (inv: { organizationId: string | null }, orgId: string) =>
      orgId === "none"
        ? inv.organizationId === null
        : inv.organizationId === orgId,
    []
  );

  useEffect(() => {
    if (!inventories || !organizations) return;

    const isKnownOrganization =
      selectedOrganizationId === "none" ||
      (selectedOrganizationId !== undefined &&
        organizations.some((o) => o.id === selectedOrganizationId));

    const nextOrganizationId = isKnownOrganization
      ? selectedOrganizationId
      : (inventories[0]?.organizationId ?? "none");

    const inventoriesForOrg = inventories.filter((inv) =>
      matchesOrg(inv, nextOrganizationId)
    );

    const nextInventoryId = inventoriesForOrg.some(
      (inv) => inv.id === selectedCarbonInventoryId
    )
      ? selectedCarbonInventoryId
      : inventoriesForOrg[0]?.id;

    const shouldUpdate =
      nextOrganizationId !== selectedOrganizationId ||
      nextInventoryId !== selectedCarbonInventoryId;

    if (shouldUpdate) {
      void navigate({
        to: Routes.REDUCTION_PLAN,
        replace: true,
        search: {
          organizationId: nextOrganizationId,
          carbonInventoryId: nextInventoryId,
        },
      });
    }
  }, [
    inventories,
    organizations,
    selectedOrganizationId,
    selectedCarbonInventoryId,
    matchesOrg,
    navigate,
  ]);

  const inventoriesForSelectedOrg = useMemo(() => {
    if (!selectedOrganizationId) return [];
    return inventories?.filter((inv) =>
      matchesOrg(inv, selectedOrganizationId)
    );
  }, [inventories, selectedOrganizationId, matchesOrg]);

  const {
    data: reductionPlan,
    isLoading: isLoadingPlan,
    isError: isErrorPlan,
  } = useReductionPlan(selectedCarbonInventoryId);

  const effectiveCategoryId = useMemo(() => {
    const categories = reductionPlan?.categories ?? [];
    if (categories.length === 0) return null;

    if (
      selectedCategoryId &&
      categories.some((c) => c.id === selectedCategoryId)
    ) {
      return selectedCategoryId;
    }

    return categories[0].id;
  }, [reductionPlan?.categories, selectedCategoryId]);

  const effectiveCategory = useMemo(
    () => reductionPlan?.categories.find((c) => c.id === effectiveCategoryId),
    [reductionPlan?.categories, effectiveCategoryId]
  );

  if (isLoadingInventories || isLoadingOrganizations) {
    return (
      <Box className="flex flex-1 items-center justify-center">
        <CircularProgress />
      </Box>
    );
  }

  if (isErrorInventories || isErrorOrganizations) {
    return (
      <Box className="flex flex-1 items-center justify-center">
        <LoadingErrorStateMessage />
      </Box>
    );
  }

  if (inventories && inventories.length === 0) {
    return (
      <ScreenEmptyState
        title="Aún no tienes una huella"
        description="Crea tu primera huella para comenzar a ver tu plan de reducción."
        action={{
          label: "Ir a Huella Organizacional",
          onClick: () => void navigate({ to: Routes.CARBON_INVENTORIES }),
        }}
      />
    );
  }

  if (!selectedOrganizationId) {
    return (
      <Box className="flex flex-1 items-center justify-center">
        <CircularProgress />
      </Box>
    );
  }

  const activeInventoryName =
    inventoriesForSelectedOrg?.find(
      (inv) => inv.id === selectedCarbonInventoryId
    )?.name ?? "";

  return (
    <ExplanationProvider>
      <Box className="flex flex-1 flex-col gap-6">
        <ReductionPlanHeader
          organizations={organizations ?? []}
          inventories={inventoriesForSelectedOrg ?? []}
          selectedOrganizationId={selectedOrganizationId}
          selectedCarbonInventory={selectedCarbonInventoryId}
          onOrganizationChange={onOrganizationChange}
          onCarbonInventoryChange={onCarbonInventoryChange}
        />

        <Box className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-lg bg-white p-4">
          <Box className="flex items-center justify-between">
            <Typography variant="h6">
              Plan de reducción por categoría
            </Typography>

            <Button
              variant="outlined"
              startIcon={<Download />}
              disabled={!reductionPlan}
              onClick={() =>
                reductionPlan &&
                exportReductionPlanToExcel(activeInventoryName, reductionPlan)
              }
            >
              Descargar
            </Button>
          </Box>

          {isLoadingPlan && (
            <Box className="flex flex-1 items-center justify-center py-8">
              <CircularProgress />
            </Box>
          )}

          {!isLoadingPlan && isErrorPlan && (
            <LoadingErrorStateMessage message="Ocurrió un error al cargar el plan de reducción." />
          )}

          {!isLoadingPlan && !isErrorPlan && reductionPlan && (
            <>
              {reductionPlan.categories.length === 0 ? (
                <EmptyStateMessage message="No hay iniciativas de reducción para esta huella." />
              ) : (
                <>
                  <CategoryCarousel
                    categories={reductionPlan.categories}
                    selectedCategoryId={effectiveCategoryId ?? ""}
                    onCategorySelect={setSelectedCategoryId}
                  />

                  {effectiveCategory &&
                  effectiveCategory.subcategories.length > 0 ? (
                    <Box className="flex flex-col gap-6">
                      {effectiveCategory.subcategories.map((subcategory) => (
                        <SubcategoryInitiativeGroup
                          key={subcategory.id}
                          name={subcategory.name}
                          icon={subcategory.icon}
                          description={subcategory.description}
                          initiatives={subcategory.initiatives}
                          categoryColor={effectiveCategory.color}
                        />
                      ))}
                    </Box>
                  ) : (
                    <EmptyStateMessage message="No hay iniciativas de reducción disponibles para esta categoría." />
                  )}
                </>
              )}
            </>
          )}

          {!isLoadingPlan && !isErrorPlan && !reductionPlan && (
            <EmptyStateMessage
              message={
                inventoriesForSelectedOrg?.length === 0
                  ? selectedOrganizationId === "none"
                    ? `No hay huellas sin ${VOCAB.organization.noun.singular}.`
                    : `Esta ${VOCAB.organization.noun.singular} no tiene huellas disponibles.`
                  : "Selecciona una huella para ver el plan de reducción."
              }
            />
          )}
        </Box>
      </Box>
    </ExplanationProvider>
  );
};
