import { FC } from "react";
import { Box, Typography } from "@mui/material";
import type { GridSortModel } from "@mui/x-data-grid";
import type { GetAllRateMeasurementUnitsResponse } from "@repo/types";
import { useRateMeasurementUnits } from "@/api/query/measurementUnits";
import { MaintainerDataGrid } from "../../components/MaintainerDataGrid";
import { MaintainerPageHeader } from "../../layout/MaintainerPageHeader";
import { useRateMeasurementUnitColumns } from "./hooks/useRateMeasurementUnitColumns";

type RateMeasurementUnit = GetAllRateMeasurementUnitsResponse[number];

const DEFAULT_SORT_MODEL: GridSortModel = [
  { field: "totalReferenceCount", sort: "desc" },
];

const RATE_MEASUREMENT_UNITS_MAINTAINER_EXPLANATION_SLUGS = {
  MAIN: "rate-measurement-units-maintainer",
} as const;

export const RateMeasurementUnitsScreen: FC = () => {
  const { data: rateUnits, isLoading, isError } = useRateMeasurementUnits();

  const columns = useRateMeasurementUnitColumns();

  if (isError) {
    return (
      <>
        <MaintainerPageHeader title="Tasas" showDownload={false} />
        <Box className="rounded-sm bg-white p-3">
          <Typography variant="body2" color="text.secondary">
            No fue posible cargar las tasas.
          </Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <MaintainerPageHeader
        title="Tasas"
        subtitle="Inspecciona las tasas (unidades por unidad) derivadas de las unidades de medida y los factores de emisión. Esta vista es de solo lectura."
        explanationSlug={
          RATE_MEASUREMENT_UNITS_MAINTAINER_EXPLANATION_SLUGS.MAIN
        }
      />
      <Box className="flex w-full rounded-sm bg-white p-3">
        <MaintainerDataGrid
          editingRowId={null}
          getRowHeight={() => 50}
          loading={isLoading}
          columns={columns}
          rows={rateUnits ?? []}
          getRowId={(row: RateMeasurementUnit) => row.id}
          disableColumnSorting={false}
          hideFooter={false}
          showToolbar
          pagination
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            sorting: { sortModel: DEFAULT_SORT_MODEL },
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          disableDensitySelector
        />
      </Box>
    </>
  );
};
