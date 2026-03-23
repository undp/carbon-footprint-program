import { FC, useCallback, useMemo, useState } from "react";
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
import { OrganizationSelector } from "@/components";
import { MainLayout } from "@/components/layout";
import { InventoryActionsCell } from "./components/InventoryActionsCell";
import { CarbonInventoryStatusChip } from "@/components/CarbonInventoryStatusChip";
import {
  useCarbonInventories,
  useCarbonInventoriesMinimalData,
  useMyOrganizations,
} from "@/api/query";
import { formatEmissions } from "@/utils/formatting";
import {
  GetAllCarbonInventoriesResponse,
  CarbonInventoryDisplayStatusEnum,
  CarbonInventoryDisplayStatus,
} from "@repo/types";
import { NewInventoryDialog } from "@/components/dialogs";
import { StylizedDataGrid } from "@/components";

export const CarbonInventoriesScreen: FC = () => {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("all");

  const onYearSelectChange = useCallback((event: SelectChangeEvent) => {
    setSelectedYear(event.target.value);
  }, []);

  const { data: organizations = [], isLoading: isLoadingOrganizations } =
    useMyOrganizations();

  const { data: inventories = [], isLoading: isLoadingInventories } =
    useCarbonInventories(selectedYear, selectedOrganizationId);

  const { data: minimalInventories = [], isLoading: isLoadingYears } =
    useCarbonInventoriesMinimalData();

  const availableYears = useMemo(
    () =>
      [...new Set(minimalInventories.map((inv) => inv.year))]
        .filter((year): year is number => year !== null)
        .sort((a, b) => b - a)
        .map(String),
    [minimalInventories]
  );

  const [newInventoryDialogOpen, setNewInventoryDialogOpen] = useState(false);

  const columns: GridColDef<GetAllCarbonInventoriesResponse[number]>[] =
    useMemo(
      () => [
        {
          field: "organizationName",
          headerName: "Nombre Org.",
          align: "center",
          headerAlign: "center",
          minWidth: 100,
          flex: 1,
          cellClassName: "content-center",
          renderCell: (
            params: GridRenderCellParams<
              GetAllCarbonInventoriesResponse[number],
              GetAllCarbonInventoriesResponse[number]["organizationName"]
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
                (sin organización)
              </Typography>
            ),
        },
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
          minWidth: 150,
          flex: 1,
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
          minWidth: 212,
          flex: 1,
          cellClassName: "content-center max-h-[56px]",
          renderCell: (
            params: GridRenderCellParams<
              GetAllCarbonInventoriesResponse[number]
            >
          ) => <InventoryActionsCell carbonInventory={params.row} />,
        },
      ],
      []
    );

  const filteredInventories = useMemo(
    () =>
      inventories.filter(
        (inv) => inv.status !== CarbonInventoryDisplayStatusEnum.DELETED
      ),
    [inventories]
  );

  return (
    <MainLayout>
      <Box className="flex flex-1 flex-col gap-6">
        {/* Header */}
        <Box className="flex flex-row items-center justify-between gap-4 rounded-lg bg-white px-6 py-4">
          <Typography variant="h5" fontWeight={600}>
            Huella Organizacional
          </Typography>

          {/* Container for selectors and button */}
          <Box className="flex gap-3">
            {/* Nueva Huella Button */}
            <Button
              variant="contained"
              color="primary"
              onClick={() => setNewInventoryDialogOpen(true)}
            >
              Nueva Huella
            </Button>

            {/* Organization Selector */}
            <OrganizationSelector
              organizations={organizations}
              value={selectedOrganizationId}
              onChange={setSelectedOrganizationId}
              isLoading={isLoadingOrganizations}
              showAllOption
              showNoneOption
            />

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
          selectedOrganizationId === "none" || selectedOrganizationId === "all"
            ? undefined
            : selectedOrganizationId
        }
      />
    </MainLayout>
  );
};
