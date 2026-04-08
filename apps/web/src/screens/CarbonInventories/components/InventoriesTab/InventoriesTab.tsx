import { FC, useMemo } from "react";
import { Box, Button, Typography, useMediaQuery } from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { ResponsiveTypography, StylizedDataGrid } from "@/components";
import { CarbonInventoryStatusChip } from "@/components/CarbonInventoryStatusChip";
import { formatEmissions } from "@/utils/formatting";
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

export const InventoriesTab: FC<Props> = ({
  inventories,
  isLoading,
  onNewInventory,
}) => {
  const isWiderScreen = useMediaQuery((theme) => theme.breakpoints.up(1400));

  const columns: GridColDef<GetAllCarbonInventoriesResponse[number]>[] =
    useMemo(
      () => [
        {
          field: "name",
          renderHeader: () => (
            <Typography className="uppercase" variant="body2">
              Nombre
            </Typography>
          ),
          align: "left",
          headerAlign: "left",
          minWidth: 180,
          flex: 1.2,
          cellClassName: "content-center",
          renderCell: (
            params: GridRenderCellParams<
              GetAllCarbonInventoriesResponse[number]
            >
          ) => (
            <InventoryNameCell
              name={params.row.name}
              status={params.row.status}
            />
          ),
        },
        {
          field: "year",
          renderHeader: () => (
            <Typography className="uppercase" variant="body2">
              Año
            </Typography>
          ),
          align: "left",
          headerAlign: "left",
          cellClassName: "content-center",
          minWidth: 80,
          flex: 0.4,
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
              className="uppercase"
              isWiderScreen={isWiderScreen}
              ShortName="Emisiones"
              LongName="Emisiones tCO₂e"
            />
          ),
          align: "left",
          headerAlign: "left",
          minWidth: 120,
          flex: 0.6,
          cellClassName: "content-center",
          valueFormatter: (value: number) => formatEmissions(value),
        },
        {
          field: "status",
          renderHeader: () => (
            <ResponsiveTypography
              className="uppercase"
              isWiderScreen={isWiderScreen}
              ShortName="Estado"
              LongName="Estado postulación"
            />
          ),
          headerAlign: "center",
          align: "center",
          minWidth: 150,
          flex: 0.8,
          cellClassName: "content-center",
          renderCell: (
            params: GridRenderCellParams<
              GetAllCarbonInventoriesResponse[number],
              CarbonInventoryDisplayStatus
            >
          ) =>
            params.value === CarbonInventoryDisplayStatusEnum.SELF_DECLARED ? (
              <Typography variant="body2" color="textSecondary">
                —
              </Typography>
            ) : (
              <CarbonInventoryStatusChip status={params.value!} />
            ),
        },
        {
          field: "actions",
          headerName: "ACCIONES",
          headerAlign: "left",
          align: "left",
          minWidth: 212,
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
    <Box className="flex w-full flex-col gap-4 rounded-lg bg-white">
      <Box className="flex items-center justify-between px-6 pt-6">
        <Typography variant="h6" fontWeight={600}>
          Mis huellas autodeclaradas
        </Typography>
        <Button variant="contained" color="primary" onClick={onNewInventory}>
          Nueva Huella
        </Button>
      </Box>

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
          border: "none",
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderTop: `1px solid ${theme.palette.divider}`,
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: theme.palette.background.default,
            padding: "10px 24px",
          },
          "& .MuiDataGrid-cell": {
            py: "16.5px",
            px: "24px",
          },
        })}
      />
    </Box>
  );
};
