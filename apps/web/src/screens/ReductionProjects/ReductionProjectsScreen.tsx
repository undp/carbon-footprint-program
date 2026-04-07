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
  useMediaQuery,
} from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useNavigate } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import { OrganizationSelector, ResponsiveTypography } from "@/components";
import { ReductionProjectActionsCell } from "./components/ReductionProjectActionsCell";
import { ReductionProjectStatusChip } from "@/components/ReductionProjectStatusChip";
import {
  useReductionProjects,
  useReductionProjectsMinimal,
  useMyOrganizations,
  useCreateReductionProject,
} from "@/api/query";
import { Routes } from "@/interfaces";
import { formatEmissions } from "@/utils/formatting";
import {
  GetAllReductionProjectsResponse,
  ReductionProjectDisplayStatus,
} from "@repo/types";
import { StylizedDataGrid } from "@/components";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const ReductionProjectsScreen: FC = () => {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("all");

  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const createProject = useCreateReductionProject();

  const onYearSelectChange = useCallback((event: SelectChangeEvent) => {
    setSelectedYear(event.target.value);
  }, []);

  const handleCreateProject = useCallback(async () => {
    try {
      const created = await createProject.mutateAsync({});
      void navigate({
        to: Routes.REDUCTION_PROJECT,
        params: { id: String(created.id) },
      });
    } catch {
      enqueueSnackbar("No se pudo crear el proyecto", { variant: "error" });
    }
  }, [createProject, navigate, enqueueSnackbar]);

  const { data: organizations = [], isLoading: isLoadingOrganizations } =
    useMyOrganizations();

  const { data: projects = [], isLoading: isLoadingProjects } =
    useReductionProjects(selectedYear, selectedOrganizationId);

  const { data: minimalProjects = [], isLoading: isLoadingYears } =
    useReductionProjectsMinimal();

  const availableYears = useMemo(
    () =>
      [...new Set(minimalProjects.map((p) => p.year))]
        .filter((year): year is number => year !== null)
        .sort((a, b) => b - a)
        .map(String),
    [minimalProjects]
  );

  const isWiderScreen = useMediaQuery((theme) => theme.breakpoints.up(1400));

  const columns: GridColDef<GetAllReductionProjectsResponse[number]>[] =
    useMemo(
      () => [
        {
          field: "name",
          renderHeader: () => (
            <ResponsiveTypography
              isWiderScreen={isWiderScreen}
              ShortName="Nombre"
              LongName="Nombre Proyecto"
            />
          ),
          align: "center",
          headerAlign: "center",
          minWidth: 150,
          flex: 1,
          cellClassName: "content-center",
          renderCell: (
            params: GridRenderCellParams<
              GetAllReductionProjectsResponse[number],
              GetAllReductionProjectsResponse[number]["name"]
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
          renderHeader: () => (
            <ResponsiveTypography
              isWiderScreen={isWiderScreen}
              ShortName="Año"
              LongName="Año Reducción"
            />
          ),
          align: "center",
          headerAlign: "center",
          cellClassName: "content-center",
          minWidth: 100,
          flex: 0.6,
          renderCell: (
            params: GridRenderCellParams<
              GetAllReductionProjectsResponse[number],
              GetAllReductionProjectsResponse[number]["year"]
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
          field: "firstReportDate",
          renderHeader: () => (
            <ResponsiveTypography
              isWiderScreen={isWiderScreen}
              ShortName="Reporte"
              LongName="Primer Reporte"
            />
          ),
          align: "center",
          headerAlign: "center",
          cellClassName: "content-center",
          minWidth: 120,
          flex: 0.6,
          renderCell: (
            params: GridRenderCellParams<
              GetAllReductionProjectsResponse[number],
              GetAllReductionProjectsResponse[number]["firstReportDate"]
            >
          ) =>
            params.value ? (
              <Typography variant="body2" noWrap>
                {formatDate(params.value)}
              </Typography>
            ) : (
              <Typography
                color="textDisabled"
                className="italic"
                variant="body2"
              >
                —
              </Typography>
            ),
        },
        {
          field: "totalReduction",
          renderHeader: () => (
            <ResponsiveTypography
              isWiderScreen={isWiderScreen}
              ShortName="Reducción"
              LongName="Reducción (tCO₂e)"
            />
          ),
          align: "center",
          headerAlign: "center",
          minWidth: 120,
          flex: 0.6,
          cellClassName: "content-center",
          valueFormatter: (value: number | null) =>
            value != null ? formatEmissions(value) : "—",
        },
        {
          field: "status",
          headerName: "Estado",
          headerAlign: "center",
          align: "center",
          minWidth: 150,
          flex: 0.8,
          cellClassName: "content-center",
          renderCell: (
            params: GridRenderCellParams<
              GetAllReductionProjectsResponse[number],
              ReductionProjectDisplayStatus
            >
          ) => <ReductionProjectStatusChip status={params.value!} />,
        },
        {
          field: "actions",
          headerName: "Acciones",
          headerAlign: "center",
          align: "center",
          minWidth: 120,
          flex: 0.6,
          cellClassName: "content-center max-h-[56px]",
          renderCell: (
            params: GridRenderCellParams<
              GetAllReductionProjectsResponse[number]
            >
          ) => <ReductionProjectActionsCell reductionProject={params.row} />,
        },
      ],
      [isWiderScreen]
    );

  return (
    <Box className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <Box className="flex flex-row items-center justify-between gap-4 rounded-lg bg-white px-6 py-4">
        <Typography variant="h5" fontWeight={600}>
          Proyectos de Reducción
        </Typography>

        {/* Container for selectors and button */}
        <Box className="flex gap-3">
          {/* Create Project Button */}
          <Button
            variant="contained"
            color="primary"
            onClick={() => void handleCreateProject()}
            loading={createProject.isPending}
          >
            Ingresar Proyecto
          </Button>

          {/* Organization Selector */}
          <OrganizationSelector
            organizations={organizations}
            value={selectedOrganizationId}
            onChange={setSelectedOrganizationId}
            isLoading={isLoadingOrganizations}
            showAllOption
          />

          {/* Year Selector */}
          <FormControl sx={{ minHeight: 40, minWidth: 120 }} size="small">
            <InputLabel id="rp-year-select-label">Año</InputLabel>
            <Select
              labelId="rp-year-select-label"
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

      {/* Projects Table Section */}
      <Box className="flex w-full flex-col gap-4 rounded-lg bg-white p-6">
        {/* Section Header */}
        <Typography variant="h6" fontWeight={600}>
          Proyectos de reducción
        </Typography>

        <StylizedDataGrid
          autoHeight
          columnHeaderHeight={40}
          rows={projects}
          columns={columns}
          localeText={{
            noRowsLabel: "No hay proyectos de reducción disponibles",
          }}
          loading={isLoadingProjects}
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
  );
};
