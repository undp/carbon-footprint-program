import { FC, useMemo } from "react";
import { Box, Skeleton, Typography, alpha } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GetEmissionFactorsResponse } from "@repo/types";
import { useEmissionFactorsColumns } from "./useEmissionFactorsColumns";
import { LoadingErrorStateMessage } from "../LoadingErrorStateMessage";
import { EmptyStateMessage } from "../EmptyStateMessage";

interface EmissionFactorsTableProps {
  data: GetEmissionFactorsResponse | undefined;
  isLoading: boolean;
  loadingError?: boolean;
}

export const EmissionFactorsTable: FC<EmissionFactorsTableProps> = ({
  data,
  isLoading = false,
  loadingError = false,
}) => {
  const columns = useEmissionFactorsColumns();
  const rows = useMemo(
    () => (data ?? []).map((row, index) => ({ ...row, id: index })),
    [data]
  );

  return (
    <Box className="flex flex-1 flex-col gap-3">
      <Typography variant="h5" fontWeight="600">
        Factores utilizados
      </Typography>
      {isLoading && (
        <Skeleton
          variant="rounded"
          height={200}
          sx={{ borderRadius: 2, flexShrink: 0 }}
        />
      )}

      {!isLoading && loadingError && (
        <LoadingErrorStateMessage
          className="max-h-[120px]"
          message="Ocurrió un error al cargar los factores de emisión"
        />
      )}

      {!isLoading && !loadingError && !data?.length && (
        <EmptyStateMessage
          className="max-h-[120px]"
          message="Luego de registrar actividades, podrás ver un resumen de los factores de emisión utilizados"
        />
      )}

      {/* TODO: use StyledDataGrid once Chelo's branch is merged */}
      {!isLoading && !loadingError && !!data?.length && (
        <DataGrid
          rows={rows}
          columns={columns}
          getRowHeight={() => "auto"}
          hideFooter
          disableColumnResize
          disableColumnSorting
          disableColumnMenu
          disableColumnFilter
          disableColumnSelector
          disableRowSelectionOnClick
          checkboxSelection={false}
          localeText={{ noRowsLabel: "Sin factores" }}
          sx={{
            borderRadius: "8px",
            border: "1px solid #d9d9d9",
            "& .MuiDataGrid-columnHeader": {
              padding: "16px",
              backgroundColor: alpha("#414046", 0.03),
              color: "#414046",
              fontWeight: 600,
              fontSize: "0.875rem",
            },
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
              padding: "16px",
              fontSize: "0.75rem",
              lineHeight: 1.4,
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
          }}
        />
      )}
    </Box>
  );
};
