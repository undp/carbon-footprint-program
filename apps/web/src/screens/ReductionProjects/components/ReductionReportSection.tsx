import { FC } from "react";
import { Control, UseFormWatch } from "react-hook-form";
import { Box, Typography, TextField } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { FormTextField } from "@/components/form/FormTextField";
import { FormSelectField } from "@/components/form/FormSelectField";
import { InfoButton } from "@/components/InfoButton";
import { AddReductionProjectFormData, SelectOption } from "../types";

type ReductionReportSectionProps = {
  control: Control<AddReductionProjectFormData>;
  watch: UseFormWatch<AddReductionProjectFormData>;
  years: SelectOption[];
  calculatedReduction: number;
};

const inputFields: {
  name: keyof AddReductionProjectFormData;
  label: string;
  headerLabel: string;
  tooltip: string;
}[] = [
  {
    name: "baselineValue",
    label: "tCO\u2082e",
    headerLabel: "Escenario base",
    tooltip: "Ingrese el valor del escenario base",
  },
  {
    name: "projectValue",
    label: "tCO\u2082e",
    headerLabel: "Escenario proyecto",
    tooltip: "Ingrese el valor del escenario proyecto",
  },
];

export const ReductionReportSection: FC<ReductionReportSectionProps> = ({
  control,
  watch,
  years,
  calculatedReduction,
}) => {
  const projectName = watch("projectName");
  const displayName = projectName?.trim() || "[Nombre Proyecto]";

  return (
    <Box className="flex flex-col gap-4">
      <Box className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <Typography variant="body1" sx={{ fontSize: 18 }}>
          Reporte de reducciones/remociones - {displayName}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 3,
            py: 1,
            borderRadius: "4px",
            bgcolor: "rgba(2, 136, 209, 0.1)",
          }}
        >
          <InfoOutlined sx={{ color: "#01579b", fontSize: 20 }} />
          <Typography sx={{ color: "#01579b", fontSize: 14 }}>
            Todos los valores que se ingresan deben ser en Valor Absoluto
          </Typography>
        </Box>
      </Box>

      {/* Input Table */}
      <Box
        className="overflow-x-auto rounded border"
        sx={{
          borderColor: "divider",
          "& .MuiFormControl-root": { minHeight: "unset" },
        }}
      >
        <Box className="flex" sx={{ minWidth: 600 }}>
          {/* Year selector column */}
          <Box className="flex flex-1 flex-col">
            <Box
              className="flex items-center gap-2 border-b px-2"
              sx={{
                borderColor: "divider",
                height: 40,
                bgcolor: "action.hover",
              }}
            >
              <Typography
                sx={{ fontWeight: 500, fontSize: 16, whiteSpace: "nowrap" }}
              >
                Año de reducción
              </Typography>
              <InfoButton label="Seleccione el año de reducción" />
            </Box>
            <Box
              className="flex items-center border-b p-4"
              sx={{ borderColor: "divider", bgcolor: "background.paper" }}
            >
              <FormSelectField
                name="reductionYear"
                control={control}
                label="Año"
                options={years}
                size="small"
              />
            </Box>
          </Box>

          {/* Numeric input columns */}
          {inputFields.map((field) => (
            <Box key={field.name} className="flex flex-1 flex-col">
              <Box
                className="flex items-center gap-2 border-b px-2"
                sx={{
                  borderColor: "divider",
                  height: 40,
                  bgcolor: "action.hover",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 500,
                    fontSize: 16,
                    whiteSpace: "nowrap",
                  }}
                >
                  {field.headerLabel}
                </Typography>
                <InfoButton label={field.tooltip} />
              </Box>
              <Box
                className="flex items-center justify-center border-b p-4"
                sx={{ borderColor: "divider", bgcolor: "background.paper" }}
              >
                <FormTextField
                  name={field.name}
                  control={control}
                  label={field.label}
                  type="number"
                  required
                  min={0}
                  minMessage="El valor no puede ser negativo"
                  size="small"
                  sx={{ maxWidth: 220 }}
                />
              </Box>
            </Box>
          ))}

          {/* Calculated reduction column */}
          <Box className="flex flex-1 flex-col">
            <Box
              className="flex items-center gap-2 border-b px-2"
              sx={{
                borderColor: "divider",
                height: 40,
                bgcolor: "action.hover",
              }}
            >
              <Typography
                sx={{ fontWeight: 500, fontSize: 16, whiteSpace: "nowrap" }}
              >
                Reducción
              </Typography>
              <InfoButton label="Valor calculado automáticamente" />
            </Box>
            <Box
              className="flex items-center justify-center border-b p-4"
              sx={{
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <TextField
                value={calculatedReduction.toFixed(2)}
                label="tCO₂e"
                size="small"
                disabled
                sx={{ maxWidth: 220 }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
