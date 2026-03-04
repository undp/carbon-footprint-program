import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Typography,
  alpha,
  Theme,
  useTheme,
  darken,
  MenuItem,
  Select,
  SelectChangeEvent,
  InputLabel,
  FormControl,
  Tooltip,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { MainLayout } from "@/components/layout";
import { InventoryActionsCell } from "./components/InventoryActionsCell";
import { CarbonInventoryActions } from "./components/CarbonInventoryActions";
import {
  useCarbonInventories,
  useCarbonInventoriesAvailableYears,
} from "@/api/query";
import { formatEmissions } from "@/utils/formatting";
import {
  GetAllCarbonInventoriesResponse,
  CarbonInventoryDisplayStatusEnum,
  UsageMode,
  CarbonInventoryDisplayStatus,
} from "@repo/types";
import { NewInventoryDialog } from "./components/Dialogs";

// TODO: improve colors for each status
const getStatusColor = (
  theme: Theme,
  status: CarbonInventoryDisplayStatus
): string => {
  switch (status) {
    case CarbonInventoryDisplayStatusEnum.DRAFT:
      return theme.palette.grey[400];
    case CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION:
      return theme.palette.info.main;
    case CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED:
      return theme.palette.warning.main;
    case CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED:
      return theme.palette.error.main;
    case CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED:
      return theme.palette.success.main;
    case CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION:
      return theme.palette.info.main;
    case CarbonInventoryDisplayStatusEnum.VERIFICATION_OBJECTED:
      return theme.palette.warning.main;
    case CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED:
      return theme.palette.error.main;
    case CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED:
      return theme.palette.success.main;
    case CarbonInventoryDisplayStatusEnum.DELETED:
      return theme.palette.error.main;
    default:
      return theme.palette.grey[400];
  }
};

const getUsageModeLabel = (mode: UsageMode) =>
  mode === UsageMode.SIMPLIFIED ? "Asistido" : "Experto";

const STATUS_LABELS: Record<CarbonInventoryDisplayStatus, string> = {
  [CarbonInventoryDisplayStatusEnum.DRAFT]: "Borrador",
  [CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION]:
    "Postulando a cálculo",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED]:
    "Objetado en cálculo",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED]:
    "Rechazado en cálculo",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED]: "Calculado",
  [CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION]:
    "Postulando a verificación",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_OBJECTED]:
    "Objetado en verificación",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED]:
    "Rechazado en verificación",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED]: "Verificado",
  [CarbonInventoryDisplayStatusEnum.DELETED]: "Eliminado",
};

export const CarbonInventoriesScreen: FC = () => {
  const theme = useTheme();

  const [selectedYear, setSelectedYear] = useState<string>("all");

  const onYearSelectChange = useCallback((event: SelectChangeEvent) => {
    setSelectedYear(event.target.value);
  }, []);

  const {
    data: inventories = [],
    isLoading: isLoadingInventories,
    refetch: refetchInventories,
  } = useCarbonInventories(selectedYear);

  const {
    data: availableYears = [],
    isLoading: isLoadingYears,
    refetch: refetchAvailableYears,
  } = useCarbonInventoriesAvailableYears();

  const [newInventoryDialogOpen, setNewInventoryDialogOpen] = useState(false);

  const columns: GridColDef<GetAllCarbonInventoriesResponse[number]>[] =
    useMemo(
      () => [
        {
          field: "name",
          headerName: "Nombre",
          align: "center",
          headerAlign: "center",
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
              <Tooltip title={params.value}>
                <Typography variant="body2" noWrap>
                  {params.value}
                </Typography>
              </Tooltip>
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
          headerName: "Año",
          align: "center",
          headerAlign: "center",
          cellClassName: "content-center",
          minWidth: 100,
          flex: 0.6,
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
          field: "usageMode",
          headerName: "Calculadora",
          align: "left",
          headerAlign: "left",
          cellClassName: "content-center",
          minWidth: 100,
          flex: 0.6,
          valueGetter: (value: UsageMode) => getUsageModeLabel(value),
        },
        {
          field: "totalEmissions",
          headerName: "Emisiones tCO₂e",
          align: "center",
          headerAlign: "center",
          minWidth: 120,
          flex: 0.6,
          cellClassName: "content-center",
          valueFormatter: (value: number) => formatEmissions(value),
        },
        {
          field: "status",
          headerName: "Estado",
          headerAlign: "center",
          align: "center",
          minWidth: 190,
          flex: 1.5,
          cellClassName: "content-center",
          renderCell: (
            params: GridRenderCellParams<
              GetAllCarbonInventoriesResponse[number],
              CarbonInventoryDisplayStatus
            >
          ) => (
            <Chip
              sx={{
                padding: "6px 16px",
                backgroundColor: alpha(
                  getStatusColor(
                    theme,
                    params.value as CarbonInventoryDisplayStatus
                  ),
                  0.3
                ),
                color: darken(
                  getStatusColor(
                    theme,
                    params.value as CarbonInventoryDisplayStatus
                  ),
                  0.5
                ),
                border: `1px solid ${alpha(
                  getStatusColor(
                    theme,
                    params.value as CarbonInventoryDisplayStatus
                  ),
                  0.3
                )}`,
                textTransform: "uppercase",
              }}
              label={
                <Typography variant="subtitle2">
                  {STATUS_LABELS[params.value as CarbonInventoryDisplayStatus]}
                </Typography>
              }
              size="small"
            />
          ),
        },
        {
          field: "actions",
          headerName: "Acciones",
          headerAlign: "center",
          align: "center",
          minWidth: 184,
          flex: 1,
          cellClassName: "content-center max-h-[56px]",
          renderCell: (
            params: GridRenderCellParams<
              GetAllCarbonInventoriesResponse[number]
            >
          ) => (
            <InventoryActionsCell
              inventoryId={params.row.id}
              organizationId={params.row.organizationId}
              status={params.row.status}
              refetchInventories={refetchInventories}
            />
          ),
        },
      ],
      [theme, refetchInventories]
    );

  const filteredInventories = useMemo(
    () =>
      inventories.filter(
        (inv) => inv.status !== CarbonInventoryDisplayStatusEnum.DELETED
      ),
    [inventories]
  );

  useEffect(() => {
    void refetchInventories();
    void refetchAvailableYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MainLayout>
      <Box className="flex flex-1 flex-col gap-6">
        {/* Header */}
        <Box className="flex flex-row items-center justify-between gap-4 rounded-lg bg-white p-4">
          <Typography variant="h5" fontWeight={600}>
            {/* TODO: Replace with organization name */}
            Huella Organizacional
          </Typography>
          <FormControl sx={{ minHeight: 40, minWidth: 120 }} size="small">
            <InputLabel id="year-select-label">Año</InputLabel>
            <Select
              labelId="year-select-label"
              label="Año"
              value={selectedYear}
              onChange={onYearSelectChange}
              disabled={isLoadingYears}
            >
              <MenuItem key="all" value="all">
                Todos
              </MenuItem>

              {availableYears.map((year) => (
                <MenuItem key={year} value={`${year}`}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* My Footprints Section */}
        <Box className="flex w-full flex-col gap-4 rounded-lg bg-white p-6">
          {/* Section Header */}
          <CarbonInventoryActions
            onNewInventory={() => setNewInventoryDialogOpen(true)}
          />

          {/* TODO: use StyledDataGrid once Chelo's branch is merged */}
          <DataGrid
            autoHeight
            columnHeaderHeight={40}
            rows={filteredInventories}
            columns={columns}
            checkboxSelection={false}
            disableColumnResize
            disableColumnSorting
            disableColumnMenu
            disableColumnFilter
            disableColumnSelector
            disableRowSelectionOnClick
            hideFooter
            getRowHeight={() => "auto"}
            localeText={{
              noRowsLabel:
                "No hay huellas disponibles. Crea tu primera huella para comenzar",
            }}
            loading={isLoadingInventories}
            slotProps={{
              loadingOverlay: {
                variant: "skeleton",
                noRowsVariant: "skeleton",
              },
            }}
            sx={(theme) => ({
              borderRadius: "8px",
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: theme.palette.background.default,
                padding: "10px 8px",
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
                padding: "10px 8px",
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
            })}
          />
        </Box>
      </Box>
      <NewInventoryDialog
        open={newInventoryDialogOpen}
        onClose={() => setNewInventoryDialogOpen(false)}
      />
    </MainLayout>
  );
};
