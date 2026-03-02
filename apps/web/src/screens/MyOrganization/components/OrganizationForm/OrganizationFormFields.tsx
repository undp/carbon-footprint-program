import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { Control } from "react-hook-form";
import {
  FormTextField,
  FormSelectField,
  FormAutocompleteField,
  FormNumericField,
} from "@/components";
import { InfoButton } from "@/components/InfoButton";
import { CreateOrganizationBody } from "@repo/types";

type SelectOption = {
  label: string;
  value: string | number;
};

interface OrganizationFormFieldsProps {
  control: Control<CreateOrganizationBody>;
  sectorOptions: SelectOption[];
  subsectorSelectOptions: SelectOption[];
  companySizeOptions: SelectOption[];
  activityOptions: SelectOption[];
  sectorsLoading: boolean;
  organizationSizesLoading: boolean;
  activitiesLoading: boolean;
  selectedSectorId?: string;
}

/**
 * Company information form fields
 * Handles legal name, tax ID, sector, subsector, size, employees, and address
 */
export const OrganizationFormFields: FC<OrganizationFormFieldsProps> = ({
  control,
  sectorOptions,
  subsectorSelectOptions,
  companySizeOptions,
  activityOptions,
  sectorsLoading,
  organizationSizesLoading,
  activitiesLoading,
  selectedSectorId,
}) => {
  return (
    <Box className="mb-6">
      <Box className="mb-4 flex items-center gap-2">
        <Typography variant="body1" fontSize={18}>
          Ingreso de datos de la organización
        </Typography>
        <InfoButton
          label="Ingresa los datos de tu organización para la acreditación"
          size="small"
        />
      </Box>

      <Box className="flex flex-col gap-4">
        {/* Row 1: Legal Name + Commercial Name */}
        <Box className="flex gap-6">
          <FormTextField
            name="legalName"
            control={control}
            label="Nombre legal de la entidad / Razón social"
            required
          />
          <FormTextField
            name="tradeName"
            control={control}
            label="Nombre comercial"
          />
        </Box>

        {/* Row 2: Tax ID + Organization Type */}
        <Box className="flex gap-6">
          <FormTextField
            name="taxId"
            control={control}
            label="RUT / RUC / ID Tributario"
            required
          />
          <FormSelectField
            name="countryOrganizationSizeId"
            control={control}
            label="Tipo / Tamaño organización"
            options={companySizeOptions}
            disabled={organizationSizesLoading}
          />
        </Box>

        {/* Row 3: Economic Sector + Sub-sector */}
        <Box className="flex gap-6">
          <FormSelectField
            name="sectorId"
            control={control}
            label="Rubro / Sector económico"
            options={sectorOptions}
            disabled={sectorsLoading}
          />
          <FormSelectField
            name="subsectorId"
            control={control}
            label="Sub-rubro"
            options={subsectorSelectOptions}
            disabled={
              sectorsLoading ||
              !selectedSectorId ||
              subsectorSelectOptions.length === 0
            }
          />
        </Box>

        {/* Row 4: Employee Count + Address */}
        <Box className="flex gap-6">
          <FormNumericField
            name="employeesCount"
            control={control}
            label="Cantidad de trabajadores"
            disabled={organizationSizesLoading}
            min={0}
            minMessage="La cantidad no puede ser negativa"
          />
          <FormTextField
            name="address"
            control={control}
            label="Dirección / Región"
          />
        </Box>

        {/* Row 5: Main Activity */}
        <Box className="flex gap-6">
          <FormAutocompleteField
            name="mainActivityId"
            control={control}
            label="Actividad principal del negocio"
            labelId="activity-label"
            options={activityOptions}
            loading={activitiesLoading}
            disabled={activitiesLoading || activityOptions.length === 0}
            className="flex-1"
          />
          <Box className="flex-1" />
        </Box>
      </Box>
    </Box>
  );
};
