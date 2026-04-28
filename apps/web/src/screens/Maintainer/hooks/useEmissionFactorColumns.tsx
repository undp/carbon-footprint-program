import { FC, useMemo, useCallback } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import {
  Button,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { LocalFireDepartment as FlameIcon } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type {
  GetAllEmissionFactorsResponse,
  EmissionFactorForm,
} from "@repo/types";

import {
  EditableNumberCell,
  EmissionFactorSourceCell,
  SubcategoryGroupedSelectCell,
} from "../components/cells";
import { getNestedError } from "../components/cells/cellUtils";
import { ActionButtons } from "../components/ActionButtons";

type EmissionFactor = GetAllEmissionFactorsResponse[number];

interface RateMeasurementUnit {
  id: string;
  name: string;
  abbreviation: string;
  denominatorUnitId: string;
}

interface SubcategoryOption {
  id: string;
  name: string;
  categoryName: string;
  measurementUnitIds: string[];
}

export interface DimensionOption {
  required: boolean;
  values: Array<{ id: string; value: string }>;
}

export interface SubcategoryDimensions {
  dim1: DimensionOption | null;
  dim2: DimensionOption | null;
}

interface UseEmissionFactorColumnsParams {
  editingRowId: string | null;
  viewOnly: boolean;
  onCellChange: (
    rowIndex: number,
    field: keyof EmissionFactorForm,
    value: unknown
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: EmissionFactorForm) => void;
  onOpenGEIBreakdown: (rowIndex: number) => void;
  getValues: () => EmissionFactorForm[];
  subcategories: SubcategoryOption[];
  rateUnits: RateMeasurementUnit[];
  dimensionOptionsMap: Record<string, SubcategoryDimensions>;
}

const UnitEditSelect: FC<{
  rowIndex: number;
  value: string;
  onChange: (value: string) => void;
  units: RateMeasurementUnit[];
}> = ({ rowIndex, value, onChange, units }) => {
  const { control } = useFormContext();
  const { errors } = useFormState({
    control,
    name: `emissionFactors.${rowIndex}.rateMeasurementUnitId`,
  });
  const fieldError = getNestedError(
    errors as unknown as Record<string, unknown>,
    "emissionFactors",
    rowIndex,
    "rateMeasurementUnitId"
  );

  return (
    <TextField
      select
      fullWidth
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={!!fieldError}
      label={fieldError?.message ?? ""}
      sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "white" } }}
    >
      {units.map((u) => (
        <MenuItem key={u.id} value={u.id}>
          {u.abbreviation}
        </MenuItem>
      ))}
    </TextField>
  );
};

const DimensionValueEditSelect: FC<{
  rowIndex: number;
  fieldName: "dimensionValue1Name" | "dimensionValue2Name";
  value: string | null;
  onChange: (value: string | null) => void;
  options: Array<{ id: string; value: string }>;
  disabled?: boolean;
}> = ({ rowIndex, fieldName, value, onChange, options, disabled }) => {
  const { control } = useFormContext();
  const { errors } = useFormState({
    control,
    name: `emissionFactors.${rowIndex}.${fieldName}`,
  });
  const fieldError = getNestedError(
    errors as unknown as Record<string, unknown>,
    "emissionFactors",
    rowIndex,
    fieldName
  );

  return (
    <TextField
      select
      fullWidth
      size="small"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      error={!!fieldError}
      label={fieldError?.message ?? ""}
      disabled={disabled}
      sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "white" } }}
    >
      <MenuItem value="">
        <em>—</em>
      </MenuItem>
      {options.map((opt) => (
        <MenuItem key={opt.id} value={opt.value}>
          {opt.value}
        </MenuItem>
      ))}
    </TextField>
  );
};

export const useEmissionFactorColumns = ({
  editingRowId,
  viewOnly,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  onOpenGEIBreakdown,
  getValues,
  subcategories,
  rateUnits,
  dimensionOptionsMap,
}: UseEmissionFactorColumnsParams): GridColDef<EmissionFactor>[] => {
  // Row data is read via getValues (a stable function from the form) instead
  // of a `rows` array prop.  This prevents a re-render loop: form.reset →
  // useFieldArray reconciliation → new rows ref → columns recomputed →
  // DataGrid re-measures → setState → repeat.
  // renderCell calls getValues at render-time to always get the latest data
  // while columns themselves stay referentially stable.
  const getFormRow = useCallback(
    (rowId: string) => {
      const rows = getValues();
      const index = rows.findIndex((r) => r.id === rowId);
      return { index, row: rows[index] as EmissionFactorForm | undefined };
    },
    [getValues]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<EmissionFactor>[]>(
    () => [
      {
        field: "subcategoryName",
        headerName: "Sub-categoría",
        flex: 0.2,
        minWidth: 180,
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const { index: rowIndex, row: formRow } = getFormRow(params.row.id);
          const editing = isEditing(params.row.id);

          if (editing) {
            return (
              <SubcategoryGroupedSelectCell
                formArrayName="emissionFactors"
                rowIndex={rowIndex}
                fieldName="subcategoryId"
                value={formRow?.subcategoryId ?? ""}
                onChange={(value) =>
                  onCellChange(rowIndex, "subcategoryId", value)
                }
                subcategories={subcategories}
              />
            );
          }

          const name =
            subcategories.find((sc) => sc.id === formRow?.subcategoryId)
              ?.name ?? params.row.subcategoryName;
          return (
            <Typography
              variant="body2"
              onClick={
                !viewOnly ? () => onStartEditRow(params.row.id) : undefined
              }
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                cursor: !viewOnly ? "pointer" : "default",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                width: "100%",
                "&:hover": !viewOnly ? { backgroundColor: "grey.100" } : {},
              }}
            >
              {name}
            </Typography>
          );
        },
      },
      {
        field: "dimensionValue1Name",
        headerName: "Variable 1",
        flex: 0.15,
        minWidth: 130,
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const { index: rowIndex, row: formRow } = getFormRow(params.row.id);
          const editing = isEditing(params.row.id);
          const dimInfo =
            dimensionOptionsMap[formRow?.subcategoryId ?? ""]?.dim1;
          const isDimEnabled = !!dimInfo?.required;

          const disabledTooltip = !isDimEnabled
            ? "Dimensión no requerida para esta subcategoría"
            : "";

          if (editing) {
            return (
              <Tooltip title={disabledTooltip} arrow>
                <span style={{ width: "100%" }}>
                  <DimensionValueEditSelect
                    rowIndex={rowIndex}
                    fieldName="dimensionValue1Name"
                    value={formRow?.dimensionValue1Name ?? null}
                    onChange={(value) =>
                      onCellChange(rowIndex, "dimensionValue1Name", value)
                    }
                    options={dimInfo?.values ?? []}
                    disabled={!isDimEnabled}
                  />
                </span>
              </Tooltip>
            );
          }

          return (
            <Tooltip title={disabledTooltip} arrow>
              <Typography
                variant="body2"
                onClick={
                  !viewOnly ? () => onStartEditRow(params.row.id) : undefined
                }
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: !viewOnly ? "pointer" : "default",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  width: "100%",
                  color: !isDimEnabled ? "text.disabled" : "text.primary",
                  "&:hover": !viewOnly ? { backgroundColor: "grey.100" } : {},
                }}
              >
                {formRow?.dimensionValue1Name ?? "—"}
              </Typography>
            </Tooltip>
          );
        },
      },
      {
        field: "dimensionValue2Name",
        headerName: "Variable 2",
        flex: 0.15,
        minWidth: 130,
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const { index: rowIndex, row: formRow } = getFormRow(params.row.id);
          const editing = isEditing(params.row.id);
          const dimInfo =
            dimensionOptionsMap[formRow?.subcategoryId ?? ""]?.dim2;
          const isDimEnabled = !!dimInfo?.required;
          const disabledTooltip = !isDimEnabled
            ? "Dimensión no requerida para esta subcategoría"
            : "";

          if (editing) {
            return (
              <Tooltip title={disabledTooltip} arrow>
                <span style={{ width: "100%" }}>
                  <DimensionValueEditSelect
                    rowIndex={rowIndex}
                    fieldName="dimensionValue2Name"
                    value={formRow?.dimensionValue2Name ?? null}
                    onChange={(value) =>
                      onCellChange(rowIndex, "dimensionValue2Name", value)
                    }
                    options={dimInfo?.values ?? []}
                    disabled={!isDimEnabled}
                  />
                </span>
              </Tooltip>
            );
          }

          return (
            <Tooltip title={disabledTooltip} arrow>
              <Typography
                variant="body2"
                onClick={
                  !viewOnly ? () => onStartEditRow(params.row.id) : undefined
                }
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: !viewOnly ? "pointer" : "default",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  width: "100%",
                  color: !isDimEnabled ? "text.disabled" : "text.primary",
                  "&:hover": !viewOnly ? { backgroundColor: "grey.100" } : {},
                }}
              >
                {formRow?.dimensionValue2Name ?? "—"}
              </Typography>
            </Tooltip>
          );
        },
      },
      {
        field: "value",
        headerName: "Valor",
        width: 130,
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const { index: rowIndex } = getFormRow(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableNumberCell
              formArrayName="emissionFactors"
              rowIndex={rowIndex}
              fieldName="value"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "value", value)}
              onClick={
                !viewOnly && !editing
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
            />
          );
        },
      },
      {
        field: "rateMeasurementUnitName",
        headerName: "Unidad",
        flex: 0.12,
        minWidth: 120,
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const { index: rowIndex, row: formRow } = getFormRow(params.row.id);
          const editing = isEditing(params.row.id);

          const selectedSubcategory = subcategories.find(
            (sc) => sc.id === formRow?.subcategoryId
          );
          const allowedUnitIds = selectedSubcategory?.measurementUnitIds ?? [];
          const filteredUnits =
            allowedUnitIds.length > 0
              ? rateUnits.filter((u) =>
                  allowedUnitIds.includes(u.denominatorUnitId)
                )
              : rateUnits;

          if (editing) {
            return (
              <UnitEditSelect
                rowIndex={rowIndex}
                value={formRow?.rateMeasurementUnitId ?? ""}
                onChange={(value) =>
                  onCellChange(rowIndex, "rateMeasurementUnitId", value)
                }
                units={filteredUnits}
              />
            );
          }

          const unit = rateUnits.find(
            (u) => u.id === formRow?.rateMeasurementUnitId
          );
          return (
            <Typography
              variant="body2"
              onClick={
                !viewOnly ? () => onStartEditRow(params.row.id) : undefined
              }
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                cursor: !viewOnly ? "pointer" : "default",
                "&:hover": !viewOnly ? { backgroundColor: "grey.100" } : {},
              }}
            >
              {unit?.abbreviation ?? params.row.rateMeasurementUnitName}
            </Typography>
          );
        },
      },
      {
        field: "gasDetails",
        headerName: "Desglose GEI",
        width: 140,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const { index: rowIndex, row: formRow } = getFormRow(params.row.id);
          const editing = isEditing(params.row.id);
          const gd = formRow?.gasDetails;
          const hasBreakdown =
            gd &&
            (gd.CO2_FOSSIL > 0 ||
              gd.CH4 > 0 ||
              gd.N2O > 0 ||
              gd.HFC > 0 ||
              gd.PFC > 0 ||
              gd.SF6 > 0 ||
              gd.NF3 > 0);
          const blockedByOtherEditing = editingRowId !== null && !editing;

          return (
            <Button
              size="small"
              variant="outlined"
              startIcon={<FlameIcon />}
              onClick={() => onOpenGEIBreakdown(rowIndex)}
              disabled={(viewOnly && !hasBreakdown) || blockedByOtherEditing}
              sx={{
                textTransform: "none",
                borderColor: hasBreakdown ? "success.main" : "grey.400",
                color: hasBreakdown ? "success.main" : "grey.600",
                "&:hover": {
                  borderColor: hasBreakdown ? "success.dark" : "grey.500",
                  backgroundColor: hasBreakdown ? undefined : "grey.50",
                },
              }}
            >
              {viewOnly
                ? hasBreakdown
                  ? "Ver"
                  : "—"
                : hasBreakdown
                  ? "Editar"
                  : "Agregar"}
            </Button>
          );
        },
      },
      {
        field: "source",
        headerName: "Fuente",
        flex: 0.15,
        minWidth: 150,
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const { index: rowIndex, row: formRow } = getFormRow(params.row.id);
          const editing = isEditing(params.row.id);
          const subcategoryId = formRow?.subcategoryId;

          const allRows = getValues();
          const otherRowsWithSameSubcategory = subcategoryId
            ? allRows.filter(
                (r) => r.subcategoryId === subcategoryId && r.id !== formRow?.id
              )
            : [];
          const isSourceLocked = otherRowsWithSameSubcategory.length > 0;
          const lockedSource = isSourceLocked
            ? otherRowsWithSameSubcategory[0]?.source
            : undefined;

          return (
            <EmissionFactorSourceCell
              rowIndex={rowIndex}
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "source", value)}
              onClick={
                !viewOnly && !editing
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
              isSourceLocked={isSourceLocked}
              lockedSource={lockedSource}
            />
          );
        },
      },
      ...(!viewOnly
        ? [
            {
              field: "actions",
              headerName: "Acciones",
              width: 100,
              sortable: false,
              filterable: false,
              headerAlign: "center" as const,
              align: "center" as const,
              renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
                const anyEditing = editingRowId !== null;
                const { row: formRow } = getFormRow(params.row.id);

                return (
                  <ActionButtons
                    isActiveRow={anyEditing && !isEditing(params.row.id)}
                    isEditing={isEditing(params.row.id)}
                    onStopEditCells={onStopEditRow}
                    onCancelEdit={onCancelEditRow}
                    onDelete={formRow ? () => onDelete(formRow) : undefined}
                    deleteConfirmMessage="¿Estás seguro de que deseas eliminar este factor de emisión?"
                  />
                );
              },
            },
          ]
        : []),
    ],
    [
      viewOnly,
      getFormRow,
      getValues,
      isEditing,
      onCellChange,
      onStartEditRow,
      subcategories,
      rateUnits,
      dimensionOptionsMap,
      onOpenGEIBreakdown,
      editingRowId,
      onStopEditRow,
      onCancelEditRow,
      onDelete,
    ]
  );
};
