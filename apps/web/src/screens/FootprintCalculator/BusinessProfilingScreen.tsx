import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate, useParams } from "@tanstack/react-router";
import capinautPointing from "@assets/capinaut-pointing.png";
import { FootprintCalculatorLayout } from "./layout";
import { Routes } from "@/interfaces";
import { FormAutocompleteField } from "./components/form/FormAutocompleteField";
import { FormSelectField } from "./components/form/FormSelectField";
import { FormTextField } from "./components/form/FormTextField";
import { StepHeader } from "./components/StepHeader";
import { useCarbonInventory } from "@/api/query";
import { useBusinessProfilingData } from "./hooks/useBusinessProfilingData";
import {
  BusinessProfilingFormValues,
  useBusinessProfilingForm,
} from "./hooks/useBusinessProfilingForm";
import { useBusinessProfilingSubmit } from "./hooks/useBusinessProfilingSubmit";
import { useBusinessProfilingLabels } from "./hooks/useBusinessProfilingLabels";
import { CALCULATOR_YEARS_RANGE_FROM_CURRENT } from "@/config/constants";

const YEARS = Array.from(
  { length: CALCULATOR_YEARS_RANGE_FROM_CURRENT },
  (_, index) => {
    const year = new Date().getFullYear() - index;
    return year.toString();
  }
).reverse();

export const BusinessProfilingScreen: FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_BUSINESS_PROFILING,
  });

  const gradient = `linear-gradient(90deg, ${alpha(
    theme.palette.common.brightGreen,
    0.2
  )} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`;

  const { data: existingInventory, isLoading: inventoryLoading } =
    useCarbonInventory(inventoryId || "");

  const {
    control,
    handleSubmit,
    selectedSectorId,
    selectedSubsectorId,
    selectedActivityId,
  } = useBusinessProfilingForm({ existingInventory });

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
  });

  const {
    yearLabel,
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

  const goNext = () =>
    void navigate({
      to: Routes.CARBON_INVENTORY_SUB_CATEGORY_PRESELECTION as string,
      params: { inventoryId },
    });

  const { submit, isSubmitting } = useBusinessProfilingSubmit({
    inventoryId,
    onSuccess: goNext,
  });

  const onSubmit = async (data: BusinessProfilingFormValues) => {
    await submit(data);
  };

  return (
    <form
      id="business-profiling-form"
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <FootprintCalculatorLayout
        headerProps={{
          title: "Simulador de Inventario Organizacional",
        }}
        footerProps={{
          backButtonProps: {
            onClick: () => void navigate({ to: Routes.HOME as string }),
          },
          nextButtonProps: {
            type: "submit",
            form: "business-profiling-form",
            loading: isSubmitting || inventoryLoading,
            disabled: isSubmitting || inventoryLoading,
          },
        }}
      >
        <Box className="flex flex-col flex-1 gap-6 p-6">
          <Box className="flex flex-col p-6 rounded-lg bg-white gap-6">
            <StepHeader
              title="Paso 1: Perfil de empresa"
              description="Esta información nos ayudará a sugerir automáticamente las fuentes y actividades más relevantes según tu rubro."
            />
            <Box className="flex flex-row gap-6">
              <Box className="flex-1 flex flex-col gap-8">
                <FormSelectField
                  name="year"
                  control={control}
                  label={yearLabel}
                  labelId="year-label"
                  options={YEARS.map((year) => ({
                    label: year,
                    value: year,
                  }))}
                  required
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
              <Box className="flex-1 flex flex-col gap-8">
                <FormTextField
                  name="companyName"
                  control={control}
                  label={companyNameLabel}
                />
              </Box>
            </Box>
          </Box>
          <Box className="flex flex-col p-6 rounded-lg bg-white gap-8">
            <Box className="flex-1 flex flex-row gap-6">
              <FormAutocompleteField
                name="sector"
                control={control}
                label={sectorLabel}
                labelId="sector-label"
                options={sectorOptions}
                loading={sectorsLoading}
                required
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
                required
              />
            </Box>
            <Box className="flex flex-col gap-8">
              <Box className="flex-1 flex flex-row gap-6">
                <FormAutocompleteField
                  name="activity"
                  control={control}
                  label={activityLabel}
                  labelId="activity-label"
                  options={activityOptions}
                  loading={activitiesLoading}
                  disabled={activitiesLoading || activityOptions.length === 0}
                />

                <FormTextField
                  name="quantity"
                  control={control}
                  label={quantityLabel}
                  disabled={!selectedActivityId}
                />
              </Box>
            </Box>
            <Box
              className="flex flex-row w-full h-20 p-2"
              sx={{
                background: gradient,
              }}
            >
              <Box className="h-full w-10 flex items-center justify-center">
                <Box
                  component="img"
                  src={capinautPointing}
                  alt="Actividad principal"
                />
              </Box>

              <Box>
                <Typography variant="body1" fontWeight="fontWeightBold">
                  ¿Cuál es la actividad principal de tu negocio?
                </Typography>
                <Typography variant="body1">
                  Es la forma más simple y representativa de medir lo que hace
                  tu empresa. Te permite ver tu huella por unidad de servicio o
                  producto.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ejemplo: Actividad principal del negocio → cómo mides tu
                  operación (ej: paquetes entregados). Actividad principal al
                  año → cuántos hiciste el último año (ej: 220.000 paquetes).
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </FootprintCalculatorLayout>
    </form>
  );
};
