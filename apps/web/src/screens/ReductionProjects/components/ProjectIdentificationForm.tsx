import { FC } from "react";
import { Control, Controller } from "react-hook-form";
import { Box, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { FormTextField } from "@/components/form/FormTextField";
import { FormSelectField } from "@/components/form/FormSelectField";
import { AddReductionProjectFormData } from "../types";

type SelectOption = { value: string; label: string };

type ProjectIdentificationFormProps = {
  control: Control<AddReductionProjectFormData>;
  branches: SelectOption[];
  subcategories: SelectOption[];
  pcgOptions: SelectOption[];
};

export const ProjectIdentificationForm: FC<ProjectIdentificationFormProps> = ({
  control,
  branches,
  subcategories,
  pcgOptions,
}) => {
  return (
    <Box className="flex flex-col gap-10">
      {/* Row 1: Project Name and Branch */}
      <Box className="flex flex-col gap-6 md:flex-row">
        <FormTextField
          name="projectName"
          control={control}
          label="Nombre del proyecto"
          placeholder="Ingresa el nombre del proyecto"
          required
          inputProps={{ maxLength: 200 }}
        />
        <FormSelectField
          name="branch"
          control={control}
          label="Sede/sucursal/establecimiento"
          options={branches}
          required
        />
      </Box>

      {/* Row 2: Implementation Date and Emission Subcategory */}
      <Box className="flex flex-col gap-6 md:flex-row">
        <Box className="flex flex-1 flex-col gap-6">
          <FormTextField
            name="implementationDate"
            control={control}
            label="Fecha de implementación"
            placeholder="dd-mm-yyyy"
            type="date"
            InputLabelProps={{ shrink: true }}
            required
          />
          <FormSelectField
            name="emissionSubcategory"
            control={control}
            label="Subcategoría de fuente de emisión"
            options={subcategories}
            required
          />
        </Box>
        <FormTextField
          name="projectDescription"
          control={control}
          label="Descripción del proyecto"
          placeholder="Ingresa la descripción"
          multiline
          rows={5}
          required
          inputProps={{ maxLength: 1000 }}
          sx={{ flex: 1 }}
        />
      </Box>

      {/* Row 3: PCG Selection and Info Banner */}
      <Box className="flex flex-col gap-6">
        <Box className="flex flex-col gap-6 md:flex-row">
          <FormSelectField
            name="pcg"
            control={control}
            label="Potencial de calentamiento global (PCG) utilizado"
            options={pcgOptions}
            required
          />
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
              padding: 1,
              borderRadius: 1,
              background:
                "linear-gradient(90deg, rgba(86, 245, 141, 0.2) 0%, rgba(99, 228, 207, 0.2) 100%)",
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "6px",
                overflow: "hidden",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                component="img"
                src="/capinauta-icon.png"
                alt="Capinauta"
                sx={{
                  width: 40,
                  height: 40,
                  transform: "rotate(180deg) scaleY(-1)",
                }}
              />
            </Box>
            <Typography
              sx={{
                flex: 1,
                fontSize: 16,
                color: "text.primary",
                lineHeight: "normal",
              }}
            >
              Utilizar el potencial de calentamiento global del inventario
              nacional
            </Typography>
          </Box>
        </Box>

        {/* Checkboxes */}
        <Box className="flex flex-col gap-4 md:flex-row md:gap-6">
          <Controller
            name="reportedInOtherInitiative"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.value}
                    onChange={field.onChange}
                  />
                }
                label="Se ha reportado en otra iniciativa"
              />
            )}
          />
          <Controller
            name="includedInNDC"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.value}
                    onChange={field.onChange}
                  />
                }
                label="Se ha incorporado en meta nacional como mitigación del NDC"
              />
            )}
          />
        </Box>
      </Box>
    </Box>
  );
};
