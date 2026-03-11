import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Typography,
  MenuItem,
  Select,
  SelectChangeEvent,
  InputLabel,
  FormControl,
  Tooltip,
} from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { MainLayout } from "@/components/layout";
import { InventoryActionsCell } from "./components/InventoryActionsCell";
import { CarbonInventoryStatusChip } from "@/components/CarbonInventoryStatusChip";
import {
  useCarbonInventories,
  useCarbonInventoriesAvailableYears,
  useMyOrganizations,
} from "@/api/query";
import { formatEmissions } from "@/utils/formatting";
import {
  GetAllCarbonInventoriesResponse,
  CarbonInventoryDisplayStatusEnum,
  UsageMode,
  CarbonInventoryDisplayStatus,
} from "@repo/types";
import { NewInventoryDialog } from "@/components/dialogs";
import { StylizedDataGrid } from "@/components";

const getUsageModeLabel = (mode: UsageMode) =>
  mode === UsageMode.SIMPLIFIED ? "Asistido" : "Experto";

export const CarbonInventoriesScreen: FC = () => {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("all");

  const onYearSelectChange = useCallback((event: SelectChangeEvent) => {
    setSelectedYear(event.target.value);
  }, []);

  const onOrganizationSelectChange = useCallback((event: SelectChangeEvent) => {
    setSelectedOrganizationId(event.target.value);
  }, []);

  const { data: organizations = [], isLoading: isLoadingOrganizations } =
    useMyOrganizations();

  const {
    data: inventories = [],
    isLoading: isLoadingInventories,
    refetch: refetchInventories,
  } = useCarbonInventories(selectedYear, selectedOrganizationId);

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
          ) => <CarbonInventoryStatusChip status={params.value!} />,
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
              organizationDisplayStatus={params.row.organizationDisplayStatus}
              status={params.row.status}
              refetchInventories={refetchInventories}
            />
          ),
        },
      ],
      [refetchInventories]
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
            Huella Organizacional
          </Typography>

          {/* Container for selectors and button */}
          <Box className="flex gap-2">
            {/* Nueva Huella Button */}
            <Button
              variant="contained"
              color="primary"
              onClick={() => setNewInventoryDialogOpen(true)}
            >
              Nueva Huella
            </Button>

            {/* Organization Selector */}
            <FormControl sx={{ minHeight: 40, minWidth: 240 }} size="small">
              <InputLabel id="organization-select-label">
                Organización
              </InputLabel>
              <Select
                labelId="organization-select-label"
                label="Organización"
                value={selectedOrganizationId}
                onChange={onOrganizationSelectChange}
                disabled={isLoadingOrganizations}
              >
                <MenuItem key="all" value="all">
                  Todas las organizaciones
                </MenuItem>
                {organizations.map((org) => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Year Selector */}
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
        </Box>

        {/* My Footprints Section */}
        <Box className="flex w-full flex-col gap-4 rounded-lg bg-white p-6">
          {/* Section Header */}
          <Typography variant="h6" fontWeight={600}>
            Mis Huellas
          </Typography>

          <StylizedDataGrid
            autoHeight
            columnHeaderHeight={40}
            rows={filteredInventories}
            columns={columns}
            localeText={{
              noRowsLabel:
                "No hay huellas disponibles. Crea tu primera huella para comenzar",
            }}
            loading={isLoadingInventories}
            sx={(theme) => ({
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: theme.palette.background.default,
                padding: "10px 8px",
              },
              "& .MuiDataGrid-cell": {
                padding: "10px 8px",
              },
            })}
          />
        </Box>
      </Box>
      <NewInventoryDialog
        open={newInventoryDialogOpen}
        onClose={() => setNewInventoryDialogOpen(false)}
        selectedOrganizationId={
          selectedOrganizationId === "all" ? undefined : selectedOrganizationId
        }
      />
    </MainLayout>
  );
};
