import { FC } from "react";
import { Control, UseFormWatch } from "react-hook-form";
import {
  Box,
  Typography,
  Divider,
  Alert,
  TextField,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { FormTextField } from "@/components/form/FormTextField";
import { FormSelectField } from "@/components/form/FormSelectField";
import { InfoButton } from "@/components/InfoButton";
import { AddReductionProjectFormData } from "../types";

type SelectOption = { value: string; label: string };

type ReductionReportSectionProps = {
  control: Control<AddReductionProjectFormData>;
  watch: UseFormWatch<AddReductionProjectFormData>;
  years: SelectOption[];
  calculatedReduction: number;
};

const summaryHeaders = [
  "Año reducción relativo",
  "Año reducción absoluto",
  "Línea base tCO\u2082e",
  "Proyecto tCO\u2082e",
  "Fugas de carbono tCO\u2082e",
  "Remociones tCO\u2082e",
  "Reducción/Remoción tCO\u2082e",
];

const inputFields: {
  name: keyof AddReductionProjectFormData;
  label: string;
  headerLabel: string;
  tooltip: string;
}[] = [
  {
    name: "baselineValue",
    label: "tCO\u2082e",
    headerLabel: "Línea base",
    tooltip: "Ingrese el valor de línea base",
  },
  {
    name: "projectValue",
    label: "tCO\u2082e",
    headerLabel: "Proyecto",
    tooltip: "Ingrese el valor del proyecto",
  },
  {
    name: "carbonLeakage",
    label: "tCO\u2082e",
    headerLabel: "Fugas de carbono",
    tooltip: "Ingrese el valor de fugas de carbono",
  },
  {
    name: "removals",
    label: "tCO\u2082e",
    headerLabel: "Remociones",
    tooltip: "Ingrese el valor de remociones",
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
      <Divider sx={{ opacity: 0.2 }} />
      <Box className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <Typography variant="body1" sx={{ fontSize: 18 }}>
          Reporte de reducciones/remociones - {displayName}
        </Typography>
        <Alert
          icon={<InfoOutlined />}
          severity="info"
          sx={{
            height: 40,
            bgcolor: "info.light",
            color: "info.dark",
            "& .MuiAlert-icon": {
              color: "info.dark",
            },
          }}
        >
          Todos los valores que se ingresan deben ser en Valor Absoluto
        </Alert>
      </Box>

      {/* Summary Table */}
      <Box
        className="overflow-x-auto rounded border"
        sx={{ borderColor: "divider" }}
      >
        <Box className="flex" sx={{ minWidth: 700 }}>
          {summaryHeaders.map((header, index) => (
            <Box
              key={index}
              className="flex flex-1 items-center justify-center border-b px-4 py-4"
              sx={{
                borderColor: "divider",
                minHeight: 56,
                bgcolor: "action.hover",
              }}
            >
              <Typography
                sx={{ fontWeight: 500, fontSize: 16, textAlign: "center" }}
              >
                {header}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box className="flex" sx={{ minWidth: 700, bgcolor: "background.paper" }}>
          {Array(7)
            .fill("-")
            .map((value, index) => (
              <Box
                key={index}
                className="flex flex-1 items-center justify-center border-b p-4"
                sx={{ borderColor: "divider", minHeight: 72 }}
              >
                <Typography sx={{ textAlign: "center" }}>{value}</Typography>
              </Box>
            ))}
        </Box>
      </Box>

      {/* Input Table */}
      <Box
        className="overflow-x-auto rounded border"
        sx={{ borderColor: "divider" }}
      >
        <Box className="flex" sx={{ minWidth: 700 }}>
          {/* Year selector column */}
          <Box className="flex flex-1 flex-col">
            <Box
              className="flex items-center gap-2 border-b px-2"
              sx={{ borderColor: "divider", height: 40, bgcolor: "action.hover" }}
            >
              <Typography sx={{ fontWeight: 500, fontSize: 16 }}>
                Año de reducción
              </Typography>
              <InfoButton label="Seleccione el año de reducción" />
            </Box>
            <Box
              className="flex items-center justify-center border-b p-4"
              sx={{ borderColor: "divider", bgcolor: "background.paper" }}
            >
              <FormSelectField
                name="reductionYear"
                control={control}
                label="Año"
                options={years}
                required
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
                <Typography sx={{ fontWeight: 500, fontSize: 16 }}>
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
              sx={{ borderColor: "divider", height: 40, bgcolor: "action.hover" }}
            >
              <Typography sx={{ fontWeight: 500, fontSize: 16 }}>
                Reducción/Remoción
              </Typography>
              <InfoButton label="Valor calculado automáticamente" />
            </Box>
            <Box
              className="flex items-center justify-center border-b p-4"
              sx={{
                borderColor: "divider",
                minHeight: 72,
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
