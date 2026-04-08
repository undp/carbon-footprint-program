import { FC, useMemo } from "react";
import { Box, Button, Typography, useMediaQuery } from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { ResponsiveTypography, StylizedDataGrid } from "@/components";
import { CarbonInventoryStatusChip } from "@/components/CarbonInventoryStatusChip";
import { formatEmissions } from "@/utils/formatting";
import {
  GetAllCarbonInventoriesResponse,
  CarbonInventoryDisplayStatus,
} from "@repo/types";
import { DraftActionsCell } from "./DraftActionsCell";

interface DraftsTabProps {
  darftInventories: GetAllCarbonInventoriesResponse;
  allInventories: GetAllCarbonInventoriesResponse;
  isLoading: boolean;
  onNewInventory: () => void;
}

export const DraftsTab: FC<DraftsTabProps> = ({
  darftInventories,
  allInventories,
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
            <ResponsiveTypography
              className="uppercase"
              isWiderScreen={isWiderScreen}
              ShortName="Nombre"
              LongName="Nombre"
            />
          ),
          align: "left",
          headerAlign: "left",
          minWidth: 100,
          flex: 1,
          cellClassName: "content-center",
          renderCell: (
            params: GridRenderCellParams<
              GetAllCarbonInventoriesResponse[number],
              GetAllCarbonInventoriesResponse[number]["name"]
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
                (sin nombre)
              </Typography>
            ),
        },
        {
          field: "year",
          renderHeader: () => (
            <ResponsiveTypography
              className="uppercase"
              isWiderScreen={isWiderScreen}
              ShortName="Año"
              LongName="Año"
            />
          ),
          align: "left",
          headerAlign: "left",
          cellClassName: "content-center",
          minWidth: 80,
          flex: 0.5,
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
          headerName: "ESTADO",
          headerAlign: "center",
          align: "center",
          minWidth: 120,
          flex: 0.7,
          cellClassName: "content-center",
          renderCell: (
            params: GridRenderCellParams<
              GetAllCarbonInventoriesResponse[number],
              CarbonInventoryDisplayStatus
            >
          ) =>
            params.value != null ? (
              <CarbonInventoryStatusChip status={params.value} />
            ) : null,
        },
        {
          field: "actions",
          headerName: "ACCIONES",
          headerAlign: "left",
          align: "left",
          minWidth: 300,
          flex: 1.5,
          cellClassName: "content-center max-h-[68px]",
          renderCell: (
            params: GridRenderCellParams<
              GetAllCarbonInventoriesResponse[number]
            >
          ) => (
            <DraftActionsCell
              carbonInventory={params.row}
              inventories={allInventories}
            />
          ),
        },
      ],
      [allInventories, isWiderScreen]
    );

  return (
    <Box className="flex w-full flex-col gap-4 rounded-lg bg-white">
      <Box className="flex items-center justify-between px-6 pt-6">
        <Typography variant="h6" fontWeight={600}>
          Borradores
        </Typography>
        <Button variant="contained" color="primary" onClick={onNewInventory}>
          Nueva Huella
        </Button>
      </Box>

      <StylizedDataGrid
        autoHeight
        columnHeaderHeight={40}
        rows={darftInventories}
        columns={columns}
        localeText={{
          noRowsLabel: "No hay borradores disponibles",
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
