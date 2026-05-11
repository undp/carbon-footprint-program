import { useMemo, useCallback } from "react";
import {
  Button,
  Checkbox,
  Chip,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { EditOutlined, VisibilityOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useFormState, useFormContext } from "react-hook-form";
import { EditableTextCell } from "../components/cells";
import { getNestedError } from "../components/cells/cellUtils";
import { ActionButtons } from "../components/ActionButtons";
import type { DimensionFormRow } from "./useDimensionsForm";

interface SubcategoryOption {
  id: string;
  name: string;
  categoryName: string;
}

interface UseDimensionColumnsParams {
  editingRowId: string | null;
  viewOnly: boolean;
  onCellChange: (
    rowIndex: number,
    field: keyof DimensionFormRow,
    value: unknown
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: DimensionFormRow) => void;
  onOpenVariables: (rowIndex: number) => void;
  onSubcategoryChange: (rowIndex: number, subcategoryId: string) => void;
  rows: DimensionFormRow[];
  subcategoryOptions: SubcategoryOption[];
}

const VariablesCell: React.FC<{
  rowIndex: number;
  count: number;
  editing: boolean;
  viewOnly: boolean;
  onOpenVariables: (rowIndex: number) => void;
}> = ({ rowIndex, count, editing, viewOnly, onOpenVariables }) => {
  const formPath = `dimensions.${rowIndex}.variables` as const;
  const { control } = useFormContext();
  const { errors } = useFormState({ control, name: formPath });
  const fieldError = getNestedError(
    errors as unknown as Record<string, unknown>,
    "dimensions",
    rowIndex,
    "variables"
  );
  const showError = editing && !!fieldError;

  return (
    <Stack alignItems="center" spacing={0}>
      <Button
        size="small"
        variant="outlined"
        color={showError ? "error" : "primary"}
        startIcon={
          viewOnly ? (
            <VisibilityOutlined fontSize="small" />
          ) : (
            <EditOutlined fontSize="small" />
          )
        }
        onClick={() => onOpenVariables(rowIndex)}
        disabled={viewOnly && count === 0}
        sx={{ textTransform: "none" }}
      >
        {viewOnly ? "Ver" : "Editar"}
        {count > 0 && (
          <Chip
            label={count}
            size="small"
            sx={{ ml: 0.5, height: 20, minWidth: 20 }}
          />
        )}
      </Button>
    </Stack>
  );
};

export const useDimensionColumns = ({
  editingRowId,
  viewOnly,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  onOpenVariables,
  onSubcategoryChange,
  rows,
  subcategoryOptions,
}: UseDimensionColumnsParams): GridColDef<DimensionFormRow>[] => {
  const getDeleteState = useCallback(
    (row: DimensionFormRow | undefined) => {
      if (!row) {
        return {
          disabled: true,
          tooltip: "No se puede eliminar este registro",
        };
      }

      if (row.id.startsWith("temp_")) {
        return { disabled: false, tooltip: "Eliminar" };
      }

      const dimensionsInSubcategory = rows.filter(
        (candidate) =>
          candidate.subcategoryId === row.subcategoryId &&
          !candidate.id.startsWith("temp_")
      ).length;

      const blocked = dimensionsInSubcategory > 1 && row.position === 1;

      return {
        disabled: blocked,
        tooltip: blocked
          ? "Solo puedes eliminar la posición 1 cuando es la única dimensión de la subcategoría"
          : "Eliminar",
      };
    },
    [rows]
  );

  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  const groupedOptions = useMemo(() => {
    const groups = new Map<string, SubcategoryOption[]>();
    for (const opt of subcategoryOptions) {
      const group = groups.get(opt.categoryName) ?? [];
      group.push(opt);
      groups.set(opt.categoryName, group);
    }
    return groups;
  }, [subcategoryOptions]);

  return useMemo<GridColDef<DimensionFormRow>[]>(() => {
    const cols: GridColDef[] = [
      {
        field: "subcategoryId",
        headerName: "Sub-categoría",
        flex: 0.3,
        minWidth: 200,
        valueGetter: (_, row: DimensionFormRow) => {
          const formRow = rows[getRowIndex(String(row.id))];
          return formRow?.subcategoryName ?? "";
        },
        renderCell: (params: GridRenderCellParams<DimensionFormRow>) => {
          const rowId = String(params.row.id);
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const formRow = rows[rowIndex];
          const isNewRow = rowId.startsWith("temp_");

          if (!editing || !isNewRow) {
            return (
              <Typography
                onClick={
                  !viewOnly && !editing
                    ? () => onStartEditRow(rowId)
                    : undefined
                }
                sx={{
                  px: 1,
                  py: 0.5,
                  cursor: !viewOnly && !editing ? "pointer" : "default",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  width: "100%",
                  "&:hover":
                    !viewOnly && !editing
                      ? { backgroundColor: "grey.100" }
                      : {},
                }}
              >
                {formRow?.subcategoryName ?? "—"}
              </Typography>
            );
          }

          return (
            <Select
              fullWidth
              size="small"
              value={formRow?.subcategoryId ?? ""}
              onChange={(e) => onSubcategoryChange(rowIndex, e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              displayEmpty
              sx={{ backgroundColor: "white" }}
            >
              <MenuItem value="" disabled>
                Seleccionar subcategoría
              </MenuItem>
              {Array.from(groupedOptions.entries()).flatMap(
                ([categoryName, opts]) => [
                  <ListSubheader key={`header-${categoryName}`}>
                    {categoryName}
                  </ListSubheader>,
                  ...opts.map((opt) => (
                    <MenuItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </MenuItem>
                  )),
                ]
              )}
            </Select>
          );
        },
      },
      {
        field: "position",
        headerName: "Pos",
        width: 60,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<DimensionFormRow>) => {
          const rowId = String(params.row.id);
          const rowIndex = getRowIndex(rowId);
          const formRow = rows[rowIndex];
          return (
            <Typography variant="body2" color="text.secondary">
              {formRow?.position ?? "—"}
            </Typography>
          );
        },
      },
      {
        field: "name",
        headerName: "Dimensión",
        flex: 0.3,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<DimensionFormRow>) => {
          const rowId = String(params.row.id);
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          return (
            <EditableTextCell
              formArrayName="dimensions"
              rowIndex={rowIndex}
              fieldName="name"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "name", value)}
              onClick={
                !viewOnly && !editing ? () => onStartEditRow(rowId) : undefined
              }
              truncateLines={1}
            />
          );
        },
      },
      {
        field: "isRequired",
        headerName: "Requerido",
        width: 100,
        headerAlign: "center",
        align: "center",
        valueGetter: (_, row: DimensionFormRow) => {
          const formRow = rows[getRowIndex(String(row.id))];
          return formRow?.isRequired ? "Sí" : "No";
        },
        renderCell: (params: GridRenderCellParams<DimensionFormRow>) => {
          const rowId = String(params.row.id);
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const formRow = rows[rowIndex];
          const blocked = editing && !!formRow?.subcategoryHasEmissionFactors;
          return (
            <Tooltip
              title={
                blocked
                  ? "No se puede cambiar porque existen factores de emisión activos"
                  : ""
              }
            >
              <span>
                <Checkbox
                  checked={formRow?.isRequired ?? false}
                  onChange={(e) =>
                    onCellChange(rowIndex, "isRequired", e.target.checked)
                  }
                  disabled={!editing || blocked}
                  size="small"
                />
              </span>
            </Tooltip>
          );
        },
      },
      {
        field: "variables",
        headerName: "Variables",
        width: 140,
        headerAlign: "center",
        align: "center",
        sortable: false,
        filterable: false,
        disableExport: true,
        renderCell: (params: GridRenderCellParams<DimensionFormRow>) => {
          const rowId = String(params.row.id);
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const formRow = rows[rowIndex];
          const count = formRow?.variables?.length ?? 0;
          return (
            <VariablesCell
              rowIndex={rowIndex}
              count={count}
              editing={editing}
              viewOnly={viewOnly}
              onOpenVariables={onOpenVariables}
            />
          );
        },
      },
    ];

    if (!viewOnly) {
      cols.push({
        field: "actions",
        headerName: "Acciones",
        width: 120,
        sortable: false,
        filterable: false,
        disableExport: true,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<DimensionFormRow>) => {
          const anyEditing = editingRowId !== null;
          const rowId = String(params.row.id);
          const editing = isEditing(rowId);
          const rowIndex = getRowIndex(rowId);
          const formRow = rows[rowIndex];
          const deleteState = getDeleteState(formRow);

          return (
            <ActionButtons
              isActiveRow={anyEditing && !editing}
              isEditing={editing}
              onStopEditCells={onStopEditRow}
              onCancelEdit={onCancelEditRow}
              onDelete={formRow ? () => onDelete(formRow) : undefined}
              deleteDisabled={deleteState.disabled}
              deleteTooltipTitle={deleteState.tooltip}
              deleteConfirmMessage="¿Estás seguro? Se eliminarán todos los factores de emisión asociados a esta dimensión."
            />
          );
        },
      });
    }

    return cols;
  }, [
    viewOnly,
    getRowIndex,
    isEditing,
    onCellChange,
    onStartEditRow,
    onStopEditRow,
    onCancelEditRow,
    onDelete,
    onOpenVariables,
    onSubcategoryChange,
    rows,
    groupedOptions,
    editingRowId,
    getDeleteState,
  ]);
};
