import { FC, useMemo } from "react";
import { Box, Typography, useMediaQuery } from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { ResponsiveTypography, StylizedDataGrid } from "@/components";
import { StatusChip } from "@/components/StatusChip";
import { CARBON_INVENTORY_STATUS_CONFIG } from "@/labels/chips/carbonInventory";
import { formatter } from "@/utils/formatting";
import {
  GetAllCarbonInventoriesResponse,
  CarbonInventoryDisplayStatus,
  CarbonInventoryDisplayStatusEnum,
} from "@repo/types";
import { InventoryActionsCell } from "./InventoryActionsCell";
import { InventoryNameCell } from "./InventoryNameCell";

interface Props {
  inventories: GetAllCarbonInventoriesResponse;
  isLoading: boolean;
  onNewInventory: () => void;
}

export const InventoriesTab: FC<Props> = ({ inventories, isLoading }) => {
  const isWiderScreen = useMediaQuery((theme) => theme.breakpoints.up(1400));

  const columns: GridColDef<GetAllCarbonInventoriesResponse[number]>[] =
    useMemo(
      () => [
        {
          field: "name",
          headerName: "Nombre",
          align: "left",
          headerAlign: "left",
          minWidth: 225,
          flex: 1,
          cellClassName: "content-center",
          renderCell: (
            params: GridRenderCellParams<
              GetAllCarbonInventoriesResponse[number]
            >
          ) => (
            <InventoryNameCell
              name={params.row.name}
              recognitions={params.row.recognitions}
              organizationName={params.row.organizationName}
            />
          ),
        },
        {
          field: "year",
          renderHeader: () => (
            <ResponsiveTypography
              isWiderScreen={isWiderScreen}
              ShortName="Año"
              LongName="Año de medición"
            />
          ),
          align: "left",
          headerAlign: "left",
          cellClassName: "content-center",
          minWidth: isWiderScreen ? 125 : 80,
          renderCell: (
            params: GridRenderCellParams<
              GetAllCarbonInventoriesResponse[number],
              GetAllCarbonInventoriesResponse[number]["year"]
            >
          ) =>
            params.value ? (
              <Typography variant="body2" noWrap>
                {params.value}
              </Typography>
            ) : (
              <Typography
                color="textDisabled"
                className="italic"
                variant="body2"
              >
                (sin año)
              </Typography>
            ),
        },
        {
          field: "totalEmissions",
          renderHeader: () => (
            <ResponsiveTypography
              isWiderScreen={isWiderScreen}
              ShortName="Emisiones"
              LongName="Emisiones (tCO₂e)"
            />
          ),
          align: "left",
          headerAlign: "left",
          minWidth: 120,
          flex: 0.6,
          cellClassName: "content-center",
          valueFormatter: (value: number) => formatter.emissions(value),
        },
        {
          field: "status",
          renderHeader: () => (
            <ResponsiveTypography
              isWiderScreen={isWiderScreen}
              ShortName="Estado"
              LongName="Estado postulación"
            />
          ),
          headerAlign: "center",
          align: "center",
          minWidth: 190,
          flex: 0.8,
          cellClassName: "content-center",
          renderCell: (
            params: GridRenderCellParams<
              GetAllCarbonInventoriesResponse[number],
              CarbonInventoryDisplayStatus
            >
          ) =>
            params.value === CarbonInventoryDisplayStatusEnum.SELF_DECLARED ||
            params.value == null ? (
              <Typography variant="body2" color="textSecondary">
                —
              </Typography>
            ) : (
              <StatusChip
                config={CARBON_INVENTORY_STATUS_CONFIG[params.value]}
              />
            ),
        },
        {
          field: "actions",
          headerName: "Acciones",
          headerAlign: "left",
          align: "left",
          flex: 1,
          cellClassName: "content-center max-h-[98px]",
          renderCell: (
            params: GridRenderCellParams<
              GetAllCarbonInventoriesResponse[number]
            >
          ) => <InventoryActionsCell carbonInventory={params.row} />,
        },
      ],
      [isWiderScreen]
    );

  return (
    <Box className="flex w-full flex-col gap-4">
      <Box className="flex p-4">
        <StylizedDataGrid
          autoHeight
          columnHeaderHeight={40}
          rows={inventories}
          columns={columns}
          localeText={{
            noRowsLabel: "No hay huellas disponibles",
          }}
          loading={isLoading}
          sx={(theme) => ({
            borderTop: `1px solid ${theme.palette.divider}`,
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: theme.palette.background.default,
              padding: "10px 8px",
            },
            "& .MuiDataGrid-cell": {
              px: "8px",
            },
          })}
        />
      </Box>
    </Box>
  );
};
