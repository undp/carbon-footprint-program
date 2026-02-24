import { FC } from "react";
import { Control } from "react-hook-form";
import { Box, Typography } from "@mui/material";
import { FormTextField } from "@/components/form/FormTextField";
import { FormSelectField } from "@/components/form/FormSelectField";
import { AddReductionProjectFormData, SelectOption } from "../types";

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
      <Box
        sx={{
          display: { xs: "flex", md: "grid" },
          gridTemplateColumns: { md: "1fr 1fr" },
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <Box className="flex flex-col gap-6">
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
          rows={6}
          required
          inputProps={{ maxLength: 1000 }}
          sx={{
            "& .MuiInputBase-root": {
              paddingTop: "10px",
              paddingBottom: "10px",
            },
          }}
        />
      </Box>

      {/* Row 3: PCG Selection and Info Banner */}
      <Box className="flex flex-col gap-6">
        <Box
          sx={{
            display: { xs: "flex", md: "grid" },
            gridTemplateColumns: { md: "1fr 1fr" },
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <FormSelectField
            name="pcg"
            control={control}
            label="Potencial de calentamiento global (PCG) utilizado"
            options={pcgOptions}
            required
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: 56,
              gap: 1,
              padding: 2,
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

      </Box>
    </Box>
  );
};
