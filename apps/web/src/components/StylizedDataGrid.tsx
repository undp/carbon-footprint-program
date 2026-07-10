import { DataGrid, DataGridProps } from "@mui/x-data-grid";
import { SxProps, Theme } from "@mui/material";

export interface StylizedDataGridProps extends Omit<DataGridProps, "sx"> {
  /**
   * Custom styles that are merged with the base styles.
   * Allows overriding the default DataGrid styles.
   */
  sx?: SxProps<Theme>;
}

/**
 * DataGrid with reusable styles applied by default.
 * Styles can be overridden via the `sx` prop.
 */
export const StylizedDataGrid = ({
  sx,
  hideFooter = true,
  disableColumnResize = true,
  disableColumnSorting = true,
  disableColumnMenu = true,
  disableColumnFilter = true,
  disableColumnSelector = true,
  disableRowSelectionOnClick = true,
  checkboxSelection = false,
  getRowHeight = () => "auto",
  slotProps,
  localeText,
  ...props
}: StylizedDataGridProps) => {
  const baseStyles: SxProps<Theme> = {
    borderRadius: "8px",
    "& .MuiDataGrid-columnHeader:focus": {
      outline: "none",
    },
    "& .MuiDataGrid-columnHeader:focus-within": {
      outline: "none",
    },
    "& .MuiDataGrid-columnSeparator": {
      display: "none",
    },
    "& .MuiDataGrid-cell": {
      padding: "8px",
    },
    "& .MuiDataGrid-cell:focus": {
      outline: "none",
    },
    "& .MuiDataGrid-cell:focus-within": {
      outline: "none",
    },
    "& .MuiDataGrid-row:hover": {
      backgroundColor: "transparent",
    },
    "--DataGrid-overlayHeight": "56px",
  };

  // Merge base styles with custom styles
  const sxArray = (Array.isArray(sx) ? sx : sx ? [sx] : []) as SxProps<Theme>[];
  const combinedStyles = [baseStyles, ...sxArray] as SxProps<Theme>;

  return (
    <DataGrid
      sx={combinedStyles}
      hideFooter={hideFooter}
      disableColumnResize={disableColumnResize}
      disableColumnSorting={disableColumnSorting}
      disableColumnMenu={disableColumnMenu}
      disableColumnFilter={disableColumnFilter}
      disableColumnSelector={disableColumnSelector}
      disableRowSelectionOnClick={disableRowSelectionOnClick}
      checkboxSelection={checkboxSelection}
      getRowHeight={getRowHeight}
      slotProps={{
        loadingOverlay: {
          variant: "skeleton",
          noRowsVariant: "skeleton",
        },
        ...(slotProps || {}),
      }}
      ignoreDiacritics
      localeText={{
        noRowsLabel: "No hay filas para mostrar",
        paginationRowsPerPage: "Filas por página",
        paginationDisplayedRows: ({ from, to, count }) =>
          `${from}-${to} de ${count}`,
        columnMenuSortAsc: "Ordenar ascendente",
        columnMenuSortDesc: "Ordenar descendente",
        columnMenuFilter: "Filtrar",
        columnMenuUnsort: "Quitar orden",
        toolbarFilters: "Filtros",
        toolbarExport: "Exportar",
        toolbarExportPrint: "Imprimir",
        toolbarExportCSV: "Descargar como CSV",
        toolbarQuickFilterLabel: "Buscar",
        toolbarQuickFilterPlaceholder: "Buscar...",
        toolbarQuickFilterDeleteIconLabel: "Borrar",
        filterPanelColumn: "Columnas",
        filterPanelOperator: "Operadores",
        filterPanelInputLabel: "Valor",
        filterPanelInputPlaceholder: "Valor de filtro",
        filterOperatorContains: "contiene",
        filterOperatorEquals: "es igual a",
        filterOperatorStartsWith: "empieza con",
        filterOperatorEndsWith: "termina con",
        filterOperatorIsEmpty: "está vacío",
        filterOperatorIsNotEmpty: "no está vacío",
        filterOperatorDoesNotContain: "no contiene",
        filterOperatorDoesNotEqual: "no es igual a",
        filterOperatorIsAnyOf: "es cualquiera de",
        ...(localeText || {}),
      }}
      {...props}
    />
  );
};
