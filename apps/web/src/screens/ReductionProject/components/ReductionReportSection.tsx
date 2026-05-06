import { FC, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import { Control, Controller, useWatch } from "react-hook-form";
import type { GridColDef } from "@mui/x-data-grid";
import { NumericInput } from "@/components/NumericInput";
import { StylizedDataGrid } from "@/components/StylizedDataGrid";
import { InfoButton } from "@/components";
import { formatter } from "@/utils/formatting";
import type { ReductionProjectFormValues } from "../formSchema";

interface Props {
  control: Control<ReductionProjectFormValues>;
  disabled: boolean;
  projectName: string;
}

interface ReportRow {
  id: number;
}

export const ReductionReportSection: FC<Props> = ({
  control,
  disabled,
  projectName,
}) => {
  const baselineScenario = useWatch({ control, name: "baselineScenario" });
  const projectScenario = useWatch({ control, name: "projectScenario" });
  const year = useWatch({ control, name: "year" });

  const reduction = useMemo(() => {
    if (baselineScenario == null || projectScenario == null) {
      return null;
    }
    return baselineScenario - projectScenario;
  }, [baselineScenario, projectScenario]);

  const columns: GridColDef<ReportRow>[] = useMemo(
    () => [
      {
        field: "year",
        headerName: "Año de reducción",
        flex: 1,
        minWidth: 160,
        renderHeader: () => (
          <Box className="flex items-center gap-1">
            <Typography variant="body2" fontWeight={500}>
              Año de reducción
            </Typography>
            <InfoButton label="Año de la huella seleccionada." size="small" />
          </Box>
        ),
        renderCell: () => (
          <Box className="flex items-center px-2 py-4">
            <Typography>{year || "—"}</Typography>
          </Box>
        ),
      },
      {
        field: "baselineScenario",
        headerName: "Escenario base",
        flex: 1,
        minWidth: 160,
        renderHeader: () => (
          <Box className="flex items-center gap-1">
            <Typography variant="body2" fontWeight={500}>
              Escenario base
            </Typography>
            <InfoButton
              label="Emisiones del escenario base en tCO₂e (valor absoluto)"
              size="small"
            />
          </Box>
        ),
        renderCell: () => (
          <Box className="w-full py-1">
            <Controller
              name="baselineScenario"
              control={control}
              render={({ field, fieldState }) => (
                <NumericInput
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  suffix="tCO₂e"
                  min={0}
                  required
                  fieldError={fieldState.error}
                />
              )}
            />
          </Box>
        ),
      },
      {
        field: "projectScenario",
        headerName: "Escenario proyecto",
        flex: 1,
        minWidth: 160,
        renderHeader: () => (
          <Box className="flex items-center gap-1">
            <Typography variant="body2" fontWeight={500}>
              Escenario proyecto
            </Typography>
            <InfoButton
              label="Emisiones del escenario del proyecto en tCO₂e (valor absoluto)"
              size="small"
            />
          </Box>
        ),
        renderCell: () => (
          <Box className="w-full py-1">
            <Controller
              name="projectScenario"
              control={control}
              render={({ field, fieldState }) => (
                <NumericInput
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  suffix="tCO₂e"
                  min={0}
                  required
                  fieldError={fieldState.error}
                />
              )}
            />
          </Box>
        ),
      },
      {
        field: "reduction",
        headerName: "Reducción",
        flex: 1,
        minWidth: 160,
        renderHeader: () => (
          <Box className="flex items-center gap-1">
            <Typography variant="body2" fontWeight={500}>
              Reducción
            </Typography>
            <InfoButton
              label="Valor calculado automáticamente: Escenario base - Escenario proyecto"
              size="small"
            />
          </Box>
        ),
        renderCell: () => (
          <Box className="flex items-center justify-end px-10 py-4">
            <Typography fontWeight={500}>
              {formatter.emissions(reduction)}
            </Typography>
          </Box>
        ),
      },
    ],
    [control, disabled, year, reduction]
  );

  const rows: ReportRow[] = [{ id: 1 }];

  return (
    <Box className="flex flex-col gap-4">
      <Box className="flex items-center justify-between">
        <Typography variant="body1" fontSize={18}>
          Reporte de reducción
          {projectName ? ` - ${projectName}` : ""}
        </Typography>
        <Box
          className="flex items-center gap-2 rounded-lg px-4 py-2"
          sx={{ bgcolor: "info.lighter", border: 1, borderColor: "info.light" }}
        >
          <InfoOutlineIcon sx={{ color: "info.main", fontSize: 18 }} />
          <Typography variant="body2" color="info.main">
            Todos los valores que se ingresan deben ser en Valor Absoluto
          </Typography>
        </Box>
      </Box>
      <StylizedDataGrid rows={rows} columns={columns} />
    </Box>
  );
};
