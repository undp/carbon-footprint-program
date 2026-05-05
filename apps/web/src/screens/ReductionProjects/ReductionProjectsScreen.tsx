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
import {
  OrganizationSelector,
  ResponsiveTypography,
  InfoButton,
  ScreenEmptyState,
} from "@/components";
import { useExplanationDialog } from "@/contexts";
import { ReductionProjectActionsCell } from "./components/ReductionProjectActionsCell";
import { ReductionProjectStatusChip } from "@/components/ReductionProjectStatusChip";
import {
  useReductionProjects,
  useReductionProjectsMinimal,
  useMyOrganizations,
  useCarbonInventoriesMinimalData,
} from "@/api/query";
import { Routes } from "@/interfaces";
import { formatEmissions } from "@/utils/formatting";
import {
  GetAllReductionProjectsResponse,
  ReductionProjectDisplayStatus,
  CarbonInventoryDisplayStatusEnum,
} from "@repo/types";
import { StylizedDataGrid } from "@/components";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";
import { formatDateToDDMMYYYY } from "@repo/utils";

const REDUCTION_PROJECTS_EXPLANATION_SLUGS = {
  MAIN: "reduction-projects-list",
} as const;

export const ReductionProjectsScreen: FC = () => {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("all");

  const navigate = useNavigate();
  const { openExplanationBySlug } = useExplanationDialog();

  const onYearSelectChange = useCallback((event: SelectChangeEvent) => {
    setSelectedYear(event.target.value);
  }, []);

  const handleCreateProject = useCallback(() => {
    void navigate({ to: Routes.REDUCTION_PROJECT_NEW });
  }, [navigate]);

  const {
    data: organizations = [],
    isLoading: isLoadingOrganizations,
    isError: isMyOrganizationsError,
  } = useMyOrganizations();

  const {
    data: verifiedInventories = [],
    isLoading: isLoadingInventories,
    isError: isCarbonInventoriesError,
  } = useCarbonInventoriesMinimalData([
    CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
  ]);

  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    isError: isReductionProjectsError,
  } = useReductionProjects(selectedYear, selectedOrganizationId);

  const {
    data: minimalProjects = [],
    isLoading: isLoadingYears,
    isError: isReductionProjectsMinimalError,
  } = useReductionProjectsMinimal();

  const hasError =
    isMyOrganizationsError ||
    isCarbonInventoriesError ||
    isReductionProjectsError ||
    isReductionProjectsMinimalError;

  if (hasError)
    throw new Error(
      "Error al cargar la información de los proyectos de reducción"
    );

  const availableYears = useMemo(() => {
    const filtered =
      selectedOrganizationId === "all"
        ? minimalProjects
        : minimalProjects.filter(
            (p) => String(p.organizationId) === selectedOrganizationId
          );
    return [...new Set(filtered.map((p) => p.year))]
      .sort((a, b) => b - a)
      .map(String);
  }, [minimalProjects, selectedOrganizationId]);

  const sanitizedYear = useMemo(() => {
    if (selectedYear === "all") return "all";
    if (availableYears.includes(selectedYear)) return selectedYear;
    return "all";
  }, [selectedYear, availableYears]);

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
              GetAllReductionProjectsResponse[number]
            >
          ) => (
            <Box className="flex flex-col items-center gap-1">
              <Tooltip title={params.row.organizationName}>
                <Typography variant="caption" noWrap>
                  {params.row.organizationName}
                </Typography>
              </Tooltip>
              <Tooltip title={params.row.name}>
                <Typography variant="body2" noWrap>
                  {params.row.name}
                </Typography>
              </Tooltip>
            </Box>
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
          minWidth: 80,
          flex: 0.6,
          renderCell: (
            params: GridRenderCellParams<
              GetAllReductionProjectsResponse[number],
              GetAllReductionProjectsResponse[number]["year"]
            >
          ) => (
            <Tooltip title={params.value}>
              <Typography variant="body2" noWrap>
                {params.value}
              </Typography>
            </Tooltip>
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
                {formatDateToDDMMYYYY(params.value)}
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
          minWidth: 100,
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
          minWidth: 200,
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

  if (!isLoadingOrganizations && organizations.length === 0) {
    return (
      <ScreenEmptyState
        title={`Sin ${VOCAB.organization.noun.plural} ${VOCAB.inscription.adjective.plural}`}
        description={`Recuerda ${VOCAB.inscription.verb.singular} tu ${VOCAB.organization.noun.singular} antes de ingresar un proyecto de reducción.`}
        action={{
          label: `Ir a Mi ${capitalize(VOCAB.organization.noun.singular)}`,
          onClick: () => void navigate({ to: Routes.MY_ORGANIZATION }),
        }}
      />
    );
  }
  if (!isLoadingInventories && verifiedInventories.length === 0) {
    return (
      <ScreenEmptyState
        title="Sin huellas con reconocimiento de verificación"
        description="Debes tener al menos una huella con reconocimiento de verificación antes de poder ingresar un proyecto de reducción."
        action={{
          label: "Ir a Huella Organizacional",
          onClick: () => void navigate({ to: Routes.CARBON_INVENTORIES }),
        }}
      />
    );
  }

  return (
    <Box className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <Box className="flex flex-row items-center justify-between gap-4 rounded-lg bg-white px-6 py-4">
        <Typography variant="h5" fontWeight={600}>
          Proyectos de Reducción
        </Typography>

        {/* Container for selectors and button */}
        <Box className="flex gap-3">
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
              value={sanitizedYear}
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

      <Box className="flex w-full flex-col gap-4 rounded-lg bg-white p-6">
        {/* Section Header */}
        <Box className="flex items-center justify-between gap-1">
          <Box className="flex items-center gap-1">
            <Typography variant="h6" fontWeight={600}>
              Proyectos de reducción
            </Typography>
            <InfoButton
              label="Más información"
              onClick={() =>
                openExplanationBySlug(REDUCTION_PROJECTS_EXPLANATION_SLUGS.MAIN)
              }
            />
          </Box>
          {/* Create Project Button */}
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateProject}
          >
            Ingresar Proyecto
          </Button>
        </Box>

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
