import { FC, useMemo } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GetEmissionFactorsResponse } from "@repo/types";
import { useEmissionFactorsColumns } from "./useEmissionFactorsColumns";
import { LoadingErrorStateMessage } from "../LoadingErrorStateMessage";
import { EmptyStateMessage } from "../EmptyStateMessage";

interface EmissionFactorsTableProps {
  data: GetEmissionFactorsResponse | undefined;
  isLoading: boolean;
  errorLoading?: boolean;
}

export const EmissionFactorsTable: FC<EmissionFactorsTableProps> = ({
  data,
  isLoading = false,
  errorLoading = false,
}) => {
  const columns = useEmissionFactorsColumns();
  const rows = useMemo(() => data ?? [], [data]);

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

      {!isLoading && errorLoading && (
        <LoadingErrorStateMessage
          className="max-h-[120px]"
          message="Ocurrió un error al cargar los factores de emisión"
        />
      )}

      {!isLoading && !errorLoading && !data?.length && (
        <EmptyStateMessage
          className="max-h-[120px]"
          message="Luego de registrar actividades, podrás ver un resumen de los factores de emisión utilizados"
        />
      )}

      {/* TODO: use StyledDataGrid once Chelo's branch is merged */}
      {!isLoading && !errorLoading && !!data?.length && (
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
            "& .MuiDataGrid-columnHeader:focus": {
              outline: "none",
            },
            "& .MuiDataGrid-columnHeader:focus-within": {
              outline: "none",
            },
            "& .MuiDataGrid-columnSeparator": {
              display: "none",
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
