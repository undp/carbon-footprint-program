import { useMemo, useCallback, FC } from "react";
import { Autocomplete, TextField, Tooltip, Typography } from "@mui/material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { EditableTextCell } from "../../components/cells";
import { ActionButtons } from "../../components/ActionButtons";
import { getNestedError } from "../../components/cells/cellUtils";
import type { InitiativeFormRow } from "./useInitiativesForm";

interface Option {
  id: string;
  name: string;
}

interface AutocompleteCellProps {
  rowIndex: number;
  fieldName: "categoryId" | "subcategoryId";
  isEditing: boolean;
  options: Option[];
  disabled?: boolean;
  onChange: (value: string) => void;
  onClick?: () => void;
  placeholder?: string;
}

const AutocompleteCell: FC<AutocompleteCellProps> = ({
  rowIndex,
  fieldName,
  isEditing,
  options,
  disabled,
  onChange,
  onClick,
  placeholder,
}) => {
  const { control } = useFormContext();
  const value = useWatch({
    name: `initiatives.${rowIndex}.${fieldName}`,
  }) as string;
  const { errors } = useFormState({
    control,
    name: `initiatives.${rowIndex}.${fieldName}`,
  });
  const fieldError = getNestedError(
    errors as unknown as Record<string, unknown>,
    "initiatives",
    rowIndex,
    fieldName
  );

  const selected = options.find((o) => o.id === value) ?? null;

  if (!isEditing) {
    const label = selected?.name ?? "—";
    const interactive = Boolean(onClick);
    return (
      <Typography
        onClick={onClick}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        sx={{
          px: 1,
          py: 0.5,
          minHeight: "2rem",
          display: "flex",
          alignItems: "center",
          borderRadius: 1,
          cursor: interactive ? "pointer" : "default",
          width: "100%",
          whiteSpace: "normal",
          wordBreak: "break-word",
          color: selected ? undefined : "text.secondary",
          "&:hover": interactive ? { backgroundColor: "grey.100" } : {},
          "&:focus-visible": interactive
            ? { outline: "2px solid", outlineColor: "primary.main" }
            : {},
        }}
      >
        {label}
      </Typography>
    );
  }

  return (
    <Tooltip title={fieldError?.message ?? ""} arrow placement="top">
      <Autocomplete<Option, false, false, false>
        fullWidth
        size="small"
        disabled={disabled}
        options={options}
        value={selected}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, v) => option.id === v.id}
        onChange={(_, newValue) => onChange(newValue?.id ?? "")}
        sx={{
          "& .MuiAutocomplete-inputRoot": { py: 0 },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            error={!!fieldError}
            onKeyDown={(e) => e.stopPropagation()}
            sx={{
              "& .MuiOutlinedInput-root": { backgroundColor: "white" },
              minHeight: 0,
            }}
          />
        )}
      />
    </Tooltip>
  );
};

interface UseInitiativeColumnsParams {
  editingRowId: string | null;
  onCellChange: (
    rowIndex: number,
    field: keyof InitiativeFormRow,
    value: string
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: InitiativeFormRow) => void;
  onCategoryChange: (rowIndex: number, categoryId: string) => void;
  rows: InitiativeFormRow[];
  categories: Option[];
  subcategories: Array<Option & { categoryId: string }>;
}

export const useInitiativeColumns = ({
  editingRowId,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  onCategoryChange,
  rows,
  categories,
  subcategories,
}: UseInitiativeColumnsParams): GridColDef<InitiativeFormRow>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<InitiativeFormRow>[]>(
    () => [
      {
        field: "title",
        headerName: "Título",
        flex: 0.3,
        minWidth: 180,
        renderCell: (params: GridRenderCellParams<InitiativeFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName="initiatives"
              rowIndex={rowIndex}
              fieldName="title"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "title", value)}
              onClick={
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
              truncateLines={2}
            />
          );
        },
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 0.5,
        minWidth: 260,
        renderCell: (params: GridRenderCellParams<InitiativeFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName="initiatives"
              rowIndex={rowIndex}
              fieldName="description"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "description", value)}
              onClick={
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
              multiline
              maxRows={6}
              truncateLines={4}
            />
          );
        },
      },
      {
        field: "categoryId",
        headerName: "Categoría",
        flex: 0.25,
        minWidth: 160,
        renderCell: (params: GridRenderCellParams<InitiativeFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <AutocompleteCell
              rowIndex={rowIndex}
              fieldName="categoryId"
              isEditing={editing}
              options={categories}
              onChange={(value) => onCategoryChange(rowIndex, value)}
              onClick={
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
              placeholder="Seleccionar…"
            />
          );
        },
      },
      {
        field: "subcategoryId",
        headerName: "Subcategoría",
        flex: 0.25,
        minWidth: 180,
        renderCell: (params: GridRenderCellParams<InitiativeFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const row = rows[rowIndex];
          const filtered = subcategories.filter(
            (s) => s.categoryId === row?.categoryId
          );
          return (
            <AutocompleteCell
              rowIndex={rowIndex}
              fieldName="subcategoryId"
              isEditing={editing}
              options={filtered}
              disabled={!row?.categoryId}
              onChange={(value) =>
                onCellChange(rowIndex, "subcategoryId", value)
              }
              onClick={
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
              placeholder={
                row?.categoryId
                  ? "Seleccionar…"
                  : "Selecciona una categoría primero"
              }
            />
          );
        },
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 130,
        sortable: false,
        filterable: false,
        headerAlign: "center" as const,
        align: "center" as const,
        renderCell: (params: GridRenderCellParams<InitiativeFormRow>) => {
          const anyEditing = editingRowId !== null;
          const editing = isEditing(params.row.id);
          return (
            <ActionButtons
              isActiveRow={anyEditing && !editing}
              isEditing={editing}
              onStopEditCells={onStopEditRow}
              onCancelEdit={onCancelEditRow}
              onDelete={() => onDelete(params.row)}
              deleteConfirmMessage="Los planes de reducción existentes seguirán mostrando el nombre de la iniciativa. ¿Eliminar?"
            />
          );
        },
      },
    ],
    [
      getRowIndex,
      isEditing,
      onCellChange,
      onStartEditRow,
      onStopEditRow,
      onCancelEditRow,
      onDelete,
      onCategoryChange,
      categories,
      subcategories,
      rows,
      editingRowId,
    ]
  );
};
