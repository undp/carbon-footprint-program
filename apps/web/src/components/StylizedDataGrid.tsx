import { DataGrid, DataGridProps } from "@mui/x-data-grid";
import { SxProps, Theme } from "@mui/material";

export interface StylizedDataGridProps extends Omit<DataGridProps, "sx"> {
  /**
   * Estilos personalizados que se combinan con los estilos base.
   * Permite sobrescribir los estilos predeterminados del DataGrid.
   */
  sx?: SxProps<Theme>;
}

/**
 * DataGrid con estilos reutilizables aplicados por defecto.
 * Los estilos pueden ser sobrescritos mediante la prop `sx`.
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
  slotProps = {
    loadingOverlay: {
      variant: "skeleton",
      noRowsVariant: "skeleton",
    },
  },
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

  // Combinar estilos base con estilos personalizados
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
      slotProps={slotProps}
      {...props}
    />
  );
};
