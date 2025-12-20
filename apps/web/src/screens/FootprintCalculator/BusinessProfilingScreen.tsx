import { FC, useEffect, useMemo, useState } from "react";
import { Box, FormControl, TextField, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import capinautPointing from "@assets/capinaut-pointing.png";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FootprintCalculatorLayout } from "./layout";
import { Routes } from "@/interfaces";
import { FormAutocompleteField } from "./components/form/FormAutocompleteField";
import { FormSelectField } from "./components/form/FormSelectField";
import { StepHeader } from "./components/StepHeader";
import {
  useCountryOrganizationSizes,
  useCountrySectors,
  useOrganizationMainActivities,
  useCarbonInventory,
  useUpdateCarbonInventory,
} from "@/api/query";
import { CALCULATOR_YEARS_RANGE_FROM_CURRENT } from "@/config/constants";
import { useSelectorOptions } from "@/hooks";

const YEARS = Array.from(
  { length: CALCULATOR_YEARS_RANGE_FROM_CURRENT },
  (_, index) => {
    const year = new Date().getFullYear() - index;
    return year.toString();
  }
).reverse();

type FormValues = {
  year: string;
  companyName: string;
  sector: string;
  subSector: string;
  companySize: string;
  activity: string;
  meditionMode: string;
  quantity: string;
};

export const BusinessProfilingScreen: FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_BUSINESS_PROFILING,
  });

  const gradient = `linear-gradient(90deg, ${alpha(
    theme.palette.common.brightGreen,
    0.2
  )} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`;
  const { control, setValue, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      year: "",
      companyName: "",
      sector: "",
      subSector: "",
      companySize: "",
      activity: "",
      meditionMode: "",
      quantity: "",
    },
  });

  // Form field watchers
  const selectedSectorId = useWatch({ control, name: "sector" });
  const selectedSubsectorId = useWatch({ control, name: "subSector" });
  const selectedActivityId = useWatch({ control, name: "activity" });

  // Form submission handler
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      if (!inventoryId) {
        enqueueSnackbar("No se encontró el inventario a editar", {
          variant: "error",
        });
        return;
      }

      const requestData = {
        year: parseInt(data.year),
        usageMode: (data.meditionMode === "simplified"
          ? "SIMPLIFIED"
          : "EXPERT") as "SIMPLIFIED" | "EXPERT",
        organizationData: {
          name: data.companyName || null,
          sectorId: data.sector || null,
          subsectorId: data.subSector || null,
          sizeId: data.companySize || null,
          mainActivityId: data.activity || null,
          mainActivityQuantity: data.quantity ? parseInt(data.quantity) : null,
        },
      };

      await updateCarbonInventoryMutation.mutateAsync({
        id: inventoryId,
        data: requestData,
      });

      enqueueSnackbar("Inventario organizacional guardado exitosamente", {
        variant: "success",
      });

      void navigate({
        to: Routes.CARBON_INVENTORY_SUB_CATEGORY_PRESELECTION as string,
        params: { inventoryId },
      });
    } catch (error) {
      console.error("Error updating carbon inventory:", error);
      enqueueSnackbar("Error al guardar el inventario organizacional", {
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Data fetching
  const { data: sectors = [], isLoading: sectorsLoading } = useCountrySectors();
  const { data: organizationSizes = [], isLoading: organizationSizesLoading } =
    useCountryOrganizationSizes();

  // Carbon inventory hooks
  const { data: existingInventory, isLoading: inventoryLoading } =
    useCarbonInventory(inventoryId || "");
  const updateCarbonInventoryMutation = useUpdateCarbonInventory();

  // Derived data
  const selectedSector = useMemo(
    () => sectors.find((sector) => sector.id === selectedSectorId),
    [sectors, selectedSectorId]
  );

  const subsectorOptions = useMemo(
    () => selectedSector?.subsectors ?? [],
    [selectedSector]
  );

  const activityFilters = useMemo(
    () => ({
      sectorId: selectedSectorId || undefined,
      subsectorId: selectedSubsectorId || undefined,
    }),
    [selectedSectorId, selectedSubsectorId]
  );

  const { data: activities = [], isLoading: activitiesLoading } =
    useOrganizationMainActivities(activityFilters);

  // Business logic effects
  useEffect(() => {
    if (!selectedSector) {
      setValue("subSector", "");
    }
  }, [selectedSector, setValue]);

  useEffect(() => {
    if (!selectedActivityId) {
      setValue("quantity", "");
    }
  }, [selectedActivityId, setValue]);

  // Fill form when existing inventory is loaded
  useEffect(() => {
    if (existingInventory) {
      const data = existingInventory.organizationData;
      setValue("year", String(existingInventory.year || ""));
      setValue(
        "meditionMode",
        existingInventory.usageMode === "SIMPLIFIED" ? "simplified" : "expert"
      );
      setValue("companyName", String(data?.name || ""));
      setValue("sector", String(data?.sectorId || ""));
      setValue("subSector", String(data?.subsectorId || ""));
      setValue("companySize", String(data?.sizeId || ""));
      setValue("activity", String(data?.mainActivityId || ""));
      setValue("quantity", String(data?.mainActivityQuantity || ""));
    }
  }, [existingInventory, setValue]);

  // UI options (all select options together)
  const sectorOptions = useSelectorOptions(sectors, "name", "id");

  const subsectorSelectOptions = useSelectorOptions(
    subsectorOptions,
    "name",
    "id"
  );

  const companySizeOptions = useSelectorOptions(
    organizationSizes,
    "name",
    "id"
  );

  const activityOptions = useSelectorOptions(activities, "name", "id");

  // Computed display values
  const selectedActivityLabel = useMemo(
    () =>
      activities.find((activity) => activity.id === selectedActivityId)?.name,
    [activities, selectedActivityId]
  );

  const quantityLabel = selectedActivityLabel
    ? `Cantidad de ${selectedActivityLabel} al año`
    : "Selecciona la actividad principal";

  const subSectorLabel = selectedSector ? "Sub-rubro" : "Selecciona el rubro";

  return (
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    <form
      id="business-profiling-form"
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
                  label="Año del inventario a calcular"
                  labelId="year-label"
                  options={YEARS.map((year) => ({ label: year, value: year }))}
                  required
                />

                <FormAutocompleteField
                  name="sector"
                  control={control}
                  label="Rubro"
                  labelId="sector-label"
                  options={sectorOptions}
                  loading={sectorsLoading}
                  required
                />

                <FormSelectField
                  name="companySize"
                  control={control}
                  label="Tamaño"
                  labelId="company-size-label"
                  options={companySizeOptions}
                  disabled={organizationSizesLoading}
                />
              </Box>
              <Box className="flex-1 flex flex-col gap-8">
                <FormControl fullWidth>
                  <Controller
                    name="companyName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Nombre de la empresa (Opcional)"
                      />
                    )}
                  />
                </FormControl>

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
            </Box>
          </Box>
          <Box className="flex flex-col p-6 rounded-lg bg-white gap-8">
            <Box className="flex flex-row gap-6 mt-6">
              <Box className="flex-1 flex flex-row gap-6">
                <FormAutocompleteField
                  name="activity"
                  control={control}
                  label="Actividad principal del negocio"
                  labelId="activity-label"
                  options={activityOptions}
                  loading={activitiesLoading}
                  disabled={activitiesLoading || activityOptions.length === 0}
                />

                <FormControl fullWidth>
                  <Controller
                    name="quantity"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={quantityLabel}
                        disabled={!selectedActivityId}
                      />
                    )}
                  />
                </FormControl>
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
                  año → cuántos hiciste el último año (ej: 220.000
                  paquetes).{" "}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </FootprintCalculatorLayout>
    </form>
  );
};
