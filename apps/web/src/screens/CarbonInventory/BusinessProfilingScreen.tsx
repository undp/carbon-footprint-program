import { FC, useCallback, useMemo, useState } from "react";
import { Box, Divider, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate, useParams } from "@tanstack/react-router";
import capinautPointing from "@assets/capinaut-pointing.png";
import { CarbonInventoryLayout, FooterButton } from "./layout";
import { Routes } from "@/interfaces";
import { DevTool } from "@hookform/devtools";
import {
  ConfirmDialog,
  FormAutocompleteField,
  FormSelectField,
  FormTextField,
  FormNumericField,
} from "@/components";
import {
  StepHeader,
  ExitInventoryDialog,
  CarbonInventoryNavigationButton,
} from "./components";
import { useCarbonInventory, useEmissionFactorYears } from "@/api/query";
import { EXIT_DIALOG_CONTENT, YEAR_CHANGE_DIALOG_CONTENT } from "./constants";
import { useBusinessProfilingForm } from "./hooks/useBusinessProfilingForm";
import { useBusinessProfilingSubmit } from "./hooks/useBusinessProfilingSubmit";
import { useBusinessProfilingLabels } from "./hooks/useBusinessProfilingLabels";
import { buildYearOptions } from "./utils/buildYearOptions";
import {
  IS_DEVELOPMENT,
  LOCAL_BYPASS_REQUIRED_FIELDS,
} from "@/config/environment";
import { useSnackbar } from "notistack";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { useBusinessProfilingData } from "./hooks/useBusinessProfilingData";
import { useCarbonInventoryRouteGuard } from "./hooks/useCarbonInventoryRouteGuard";
import { useAuth } from "@/contexts";
import { useCommonNavigation } from "./hooks/useCommonNavigation";
import { VOCAB } from "@/config/vocab";
import { useInventoryErrorHandler } from "./hooks/useInventoryErrorHandler";
import capitalize from "lodash-es/capitalize";
import { toSafeString } from "@/utils/string";

const NO_CATALOGUE_YEARS_MESSAGE =
  "La metodología aún no tiene factores de emisión cargados para ningún año. Escribe al equipo de metodología antes de continuar.";

const ERROR_MESSAGE = {
  title: "No se encontró la huella",
  description:
    "Por favor, pruebe a recargar la página nuevamente o intente más tarde.",
  retryButtonText: "Recargar Página",
} as const;

const BUSINESS_PROFILING_EXPLANATION_SLUGS = {
  MAIN: "business-profiling",
} as const;

export const BusinessProfilingScreen: FC = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_BUSINESS_PROFILING,
  });

  const gradient = `linear-gradient(90deg, ${alpha(
    theme.palette.common.brightGreen,
    0.2
  )} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`;

  const {
    data: existingInventory,
    isLoading: isInventoryLoading,
    isError: hasInventoryError,
    error: inventoryError,
  } = useCarbonInventory(inventoryId);

  const hasOrganization = !!existingInventory?.organizationId;

  // The year selector offers what the catalogue covers, not a window around
  // today: a factor serves the footprints of its own year, so a year with no
  // factors leaves every subcategory of the capture step empty.
  const { data: catalogueYears = [], isLoading: areCatalogueYearsLoading } =
    useEmissionFactorYears(inventoryId);

  const yearOptions = useMemo(
    () => buildYearOptions(catalogueYears, existingInventory?.year ?? null),
    [catalogueYears, existingInventory?.year]
  );

  const { isReady, mustNavigateAway } =
    useCarbonInventoryRouteGuard(inventoryId);

  const {
    control,
    handleSubmit,
    resetField,
    selectedSectorId,
    selectedSubsectorId,
    selectedActivityId,
    formState: { isDirty },
  } = useBusinessProfilingForm({ existingInventory });

  // What «Mantener el año actual» restores. `resetField` puts the stored year
  // back and clears the dirty mark of that field alone, so the edits the user
  // made elsewhere survive and the next «Siguiente» saves them without asking
  // again. A footprint with no stored year has nothing to keep — the field is
  // required, and blanking it would block the form the user is trying to leave.
  const keepCurrentYear = useCallback(() => {
    if (existingInventory?.year == null) return;
    resetField("year", {
      defaultValue: toSafeString(existingInventory.year),
    });
  }, [existingInventory, resetField]);

  const {
    selectedSector,
    selectedActivity,
    sectorOptions,
    subsectorSelectOptions,
    companySizeOptions,
    activityOptions,
    sectorsLoading,
    organizationSizesLoading,
    activitiesLoading,
  } = useBusinessProfilingData({
    selectedSectorId,
    selectedSubsectorId,
    selectedActivityId,
    initialSector: existingInventory?.organizationData?.sector ?? undefined,
    initialSubsector:
      existingInventory?.organizationData?.subsector ?? undefined,
    initialMainActivity:
      existingInventory?.organizationData?.mainActivity ?? undefined,
    initialOrganizationSize:
      existingInventory?.organizationData?.size ?? undefined,
  });

  const {
    yearLabel,
    nameLabel,
    companyNameLabel,
    companySizeLabel,
    sectorLabel,
    subSectorLabel,
    activityLabel,
    quantityLabel,
  } = useBusinessProfilingLabels({
    selectedSector,
    selectedActivity,
  });

  const { goToList, goToLanding } = useCommonNavigation();

  const goNext = useCallback(() => {
    void navigate({
      to: Routes.CARBON_INVENTORY_SUBCATEGORY_PRESELECTION,
      params: { inventoryId },
    });
  }, [navigate, inventoryId]);

  const {
    submit,
    isSubmitting,
    yearChangeConfirmation: advanceYearChangeConfirmation,
  } = useBusinessProfilingSubmit({
    inventoryId,
    onSuccess: goNext,
    onKeepYear: keepCurrentYear,
  });

  const goToListOrLanding = user ? goToList : goToLanding;

  const {
    submit: submitAndExit,
    isSubmitting: isSubmittingAndExiting,
    yearChangeConfirmation: exitYearChangeConfirmation,
  } = useBusinessProfilingSubmit({
    inventoryId,
    onSuccess: goToListOrLanding,
    onKeepYear: keepCurrentYear,
  });

  useInventoryErrorHandler(inventoryError);

  // Guarded exit path for the header exit button — the only way out of step 1,
  // since it is the first step and has no previous one.
  //   - Clean form: exit immediately.
  //   - Logged in + valid form: save, then exit.
  //   - Guest, or invalid form (a freshly created inventory arrives with no
  //     year or name, so saving may not be possible): confirm exit without
  //     saving.
  const handleExitClick = useCallback(() => {
    if (!isDirty) {
      goToListOrLanding();
      return;
    }

    if (!user) {
      setIsExitDialogOpen(true);
      return;
    }

    void handleSubmit(
      (data) => submitAndExit(data, isDirty),
      () => setIsExitDialogOpen(true)
    )();
  }, [
    goToListOrLanding,
    setIsExitDialogOpen,
    isDirty,
    user,
    handleSubmit,
    submitAndExit,
  ]);

  const globalSubmitting = isSubmitting || isSubmittingAndExiting;

  const isFormDisabled =
    globalSubmitting || isInventoryLoading || hasInventoryError;

  const isLoading = isInventoryLoading || areCatalogueYearsLoading || !isReady;

  if (!isLoading && mustNavigateAway) return null;

  if (!inventoryId) {
    enqueueSnackbar("No se encontró la huella", { variant: "error" });
    void navigate({ to: Routes.CARBON_INVENTORY });
    return null;
  }

  const exitDialogProps = user
    ? EXIT_DIALOG_CONTENT.LOGGED_IN
    : EXIT_DIALOG_CONTENT.GUEST;

  // No footer "Volver" button here: step 1 is the first step, so going back
  // means leaving the wizard — exactly what the header exit button does.
  const nextButton: FooterButton = {
    text: "Siguiente",
    align: "right",
    buttonProps: {
      endIcon: <ArrowRightAltRounded />,
      variant: "contained",
      type: "submit",
      form: "business-profiling-form",
      loading: isSubmitting || isLoading,
      disabled: isFormDisabled,
    },
  };

  return (
    <>
      <form
        id="business-profiling-form"
        onSubmit={handleSubmit((data) => submit(data, isDirty))}
        noValidate
      >
        <CarbonInventoryLayout
          headerProps={{
            title: `Simulador de Huella ${capitalize(VOCAB.organization.relationalAdjective)}`,
            action: (
              <CarbonInventoryNavigationButton
                type={user ? "inventories" : "landing"}
                buttonProps={{
                  onClick: handleExitClick,
                  disabled: globalSubmitting,
                  loading: isSubmittingAndExiting,
                }}
              />
            ),
          }}
          footerProps={{
            buttons: [nextButton],
          }}
          isLoading={isLoading}
          hasError={hasInventoryError}
          errorMessage={ERROR_MESSAGE}
        >
          <Box className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
            <Box className="flex flex-col gap-6 rounded-lg bg-white p-6 pb-2">
              <StepHeader
                title="Paso 1: Perfilamiento"
                description={`La información de tu ${VOCAB.organization.noun.singular} nos ayudará a sugerir automáticamente las fuentes y actividades más relevantes según tu rubro.`}
                explanationSlug={BUSINESS_PROFILING_EXPLANATION_SLUGS.MAIN}
              />
              <Box className="flex flex-col gap-3">
                <Box className="flex flex-1 flex-row gap-6">
                  <FormSelectField
                    name="year"
                    control={control}
                    label={yearLabel}
                    labelId="year-label"
                    options={yearOptions.map((year) => ({
                      label: year,
                      value: year,
                    }))}
                    helperText={
                      yearOptions.length === 0
                        ? NO_CATALOGUE_YEARS_MESSAGE
                        : undefined
                    }
                    required
                  />
                  <FormTextField
                    name="name"
                    control={control}
                    label={nameLabel}
                    required
                  />
                </Box>
                <Divider />
                <Box className="mt-6 flex flex-1 flex-row gap-6">
                  <FormTextField
                    name="companyName"
                    control={control}
                    label={companyNameLabel}
                    disabled={hasOrganization}
                  />

                  <FormSelectField
                    name="companySize"
                    control={control}
                    label={companySizeLabel}
                    labelId="company-size-label"
                    options={companySizeOptions}
                    disabled={organizationSizesLoading}
                  />
                </Box>
              </Box>
              <Box className="flex flex-1 flex-row gap-6">
                <FormAutocompleteField
                  name="sector"
                  control={control}
                  label={sectorLabel}
                  labelId="sector-label"
                  options={sectorOptions}
                  loading={sectorsLoading}
                  required={!LOCAL_BYPASS_REQUIRED_FIELDS}
                />
                <FormAutocompleteField
                  name="subSector"
                  control={control}
                  label={subSectorLabel}
                  labelId="sub-sector-label"
                  options={subsectorSelectOptions}
                  loading={sectorsLoading}
                  disabled={
                    !selectedSector ||
                    subsectorSelectOptions.length === 0 ||
                    sectorsLoading
                  }
                  required={!LOCAL_BYPASS_REQUIRED_FIELDS}
                />
              </Box>
              <Box className="flex flex-col gap-8">
                <Box className="flex flex-1 flex-row gap-6">
                  <FormAutocompleteField
                    name="activity"
                    control={control}
                    label={activityLabel}
                    labelId="activity-label"
                    options={activityOptions}
                    loading={activitiesLoading}
                    disabled={activitiesLoading || activityOptions.length === 0}
                  />

                  <FormNumericField
                    name="quantity"
                    control={control}
                    label={quantityLabel}
                    disabled={!selectedActivityId}
                    required={!!selectedActivityId}
                    requiredMessage="Este campo es obligatorio cuando seleccionas una actividad principal"
                    min={0}
                    minMessage="La cantidad no puede ser negativa"
                    onlyInteger
                    onlyIntegerMessage="La cantidad debe ser un número entero"
                  />
                </Box>
              </Box>
              <Box
                className="flex h-20 w-full flex-row p-2"
                sx={{
                  background: gradient,
                }}
              >
                <Box className="flex h-full w-10 items-center justify-center">
                  <Box
                    component="img"
                    src={capinautPointing}
                    alt="Actividad principal"
                  />
                </Box>

                <Box>
                  <Typography variant="body1" fontWeight="fontWeightBold">
                    ¿Cuál es la actividad principal de tu{" "}
                    {VOCAB.organization.noun.singular}?
                  </Typography>
                  <Typography variant="body1">
                    Es la forma más simple y representativa de medir lo que hace
                    tu {VOCAB.organization.noun.singular}. Te permite ver tu
                    huella por unidad de servicio o producto.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ejemplo: Actividad principal de{" "}
                    {VOCAB.organization.article.singular} → cómo mides tu
                    operación (ej: envíos). Actividad principal al año → cuántos
                    hiciste el último año (ej: 800 envíos).
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </CarbonInventoryLayout>
      </form>
      {IS_DEVELOPMENT && <DevTool control={control} />}
      {/*
        Custom exit logic: useExitDialog is not used because it hardcodes the
        guest copy and skips the dirty check, and because the required fields
        make the save-on-exit path fail-able (see handleExitClick):
          - Clean form: exit immediately.
          - Logged in + valid form: save, then exit.
          - Guest, or invalid form: confirm exiting without saving.
      */}
      <ExitInventoryDialog
        open={isExitDialogOpen}
        onClose={() => setIsExitDialogOpen(false)}
        onConfirm={goToListOrLanding}
        {...exitDialogProps}
      />

      {/* One per exit that saves the year. The condition lives in
          useBusinessProfilingSubmit, so each instance only opens for the submit
          it belongs to. */}
      <ConfirmDialog
        open={advanceYearChangeConfirmation.isOpen}
        onClose={advanceYearChangeConfirmation.cancel}
        onConfirm={advanceYearChangeConfirmation.confirm}
        isLoading={isSubmitting}
        variant="error"
        {...YEAR_CHANGE_DIALOG_CONTENT}
      />
      <ConfirmDialog
        open={exitYearChangeConfirmation.isOpen}
        onClose={exitYearChangeConfirmation.cancel}
        onConfirm={exitYearChangeConfirmation.confirm}
        isLoading={isSubmittingAndExiting}
        variant="error"
        {...YEAR_CHANGE_DIALOG_CONTENT}
      />
    </>
  );
};
