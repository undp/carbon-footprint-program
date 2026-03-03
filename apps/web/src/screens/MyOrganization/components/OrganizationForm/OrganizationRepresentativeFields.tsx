import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { Control } from "react-hook-form";
import { FormSelectField, FormTextField } from "@/components";
import { InfoButton } from "@/components/InfoButton";
import { CreateOrganizationBody } from "@repo/types";
import { useJobPositions } from "@/api/query/jobPositions/useJobPositions";
import { useSelectorOptions } from "@/hooks/useSelectorOptions";

interface OrganizationRepresentativeFieldsProps {
  control: Control<CreateOrganizationBody>;
}

/**
 * Representative information form fields
 * Handles legal representative's name, ID, position, phone, and email
 */
export const OrganizationRepresentativeFields: FC<
  OrganizationRepresentativeFieldsProps
> = ({ control }) => {
  const { data: jobPositions, isLoading } = useJobPositions();

  const jobPositionOptions = useSelectorOptions(jobPositions, "name", "id");

  return (
    <Box>
      <Box className="mb-4 flex items-center gap-2">
        <Typography variant="body1" fontSize={18}>
          Ingreso de datos del representante legal o responsable institucional
        </Typography>
        <InfoButton
          label="Ingresa los datos del representante legal de tu organización"
          size="small"
        />
      </Box>

      <Box className="flex flex-col gap-4">
        {/* Row 1: Name + ID */}
        <Box className="flex gap-6">
          <FormTextField
            name="representativeFullName"
            control={control}
            label="Nombre completo"
            required
          />
          <FormTextField
            name="representativeTaxId"
            control={control}
            label="ID representante"
            required
          />
        </Box>

        {/* Row 2: Position + Phone */}
        <Box className="flex gap-6">
          <FormSelectField
            name="representativePositionId"
            control={control}
            label="Cargo"
            options={jobPositionOptions}
            disabled={isLoading}
            required
          />
          <FormTextField
            name="representativePhone"
            control={control}
            label="Teléfono"
            required
          />
        </Box>

        {/* Row 3: Email */}
        <Box className="flex gap-6">
          <FormTextField
            name="representativeEmail"
            control={control}
            label="Correo"
            className="flex-1"
            required
          />
          <Box className="flex-1" />
        </Box>
      </Box>
    </Box>
  );
};
