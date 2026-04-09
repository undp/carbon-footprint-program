import { FC, useState, useMemo } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  EmojiEventsOutlined,
  Co2Outlined,
  VerifiedOutlined,
  PublicOutlined,
} from "@mui/icons-material";
import { GridColDef, GridSortModel } from "@mui/x-data-grid";
import {
  StylizedDataGrid,
  OrganizationSelector,
  ScreenEmptyState,
} from "@/components";
import {
  useMyOrganizations,
  useOrganizationRecognitions,
  useBadgePreviews,
  useCarbonInventoriesMinimalData,
} from "@/api/query";
import {
  BadgeType,
  SubmissionType,
  CarbonInventoryDisplayStatusEnum,
  GetOrganizationRecognitionsResponse,
} from "@repo/types";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";
import { useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";

type AwardSubmissionType = Exclude<
  SubmissionType,
  "ORGANIZATION_ACCREDITATION"
>;
type AwardBadgeType = Exclude<BadgeType, "ORGANIZATION_ACCREDITATION">;

const AWARD_SUBMISSION_TYPES: AwardSubmissionType[] = [
  SubmissionType.CARBON_INVENTORY_CALCULATION,
  SubmissionType.CARBON_INVENTORY_VERIFICATION,
  SubmissionType.REDUCTION_PLAN_VERIFICATION,
  SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
];

const AWARD_BADGE_TYPES: AwardBadgeType[] = [
  BadgeType.CARBON_INVENTORY_CALCULATION,
  BadgeType.CARBON_INVENTORY_VERIFICATION,
  BadgeType.REDUCTION_PLAN_VERIFICATION,
  BadgeType.NEUTRALIZATION_PLAN_VERIFICATION,
];

// Maps each submission type to its corresponding badge type for preview icon lookup
const SUBMISSION_TYPE_TO_BADGE_TYPE: Record<
  AwardSubmissionType,
  AwardBadgeType
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]:
    BadgeType.CARBON_INVENTORY_CALCULATION,
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]:
    BadgeType.CARBON_INVENTORY_VERIFICATION,
  [SubmissionType.REDUCTION_PLAN_VERIFICATION]:
    BadgeType.REDUCTION_PLAN_VERIFICATION,
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]:
    BadgeType.NEUTRALIZATION_PLAN_VERIFICATION,
};

const SUBMISSION_LABELS: Record<AwardSubmissionType, string> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "Diploma Medición",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "Sello Verificación",
  [SubmissionType.REDUCTION_PLAN_VERIFICATION]: "Sello Reducción",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: "Sello Neutralización",
};

const SUBMISSION_CARD_COLORS: Record<AwardSubmissionType, string> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: "#e8f5e9",
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "#f5f5f5",
  [SubmissionType.REDUCTION_PLAN_VERIFICATION]: "#fff8e1",
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: "#e0f7fa",
};

const SUBMISSION_ACTION_ICON: Record<AwardSubmissionType, React.ReactElement> =
  {
    [SubmissionType.CARBON_INVENTORY_CALCULATION]: (
      <EmojiEventsOutlined fontSize="small" />
    ),
    [SubmissionType.CARBON_INVENTORY_VERIFICATION]: (
      <VerifiedOutlined fontSize="small" />
    ),
    [SubmissionType.REDUCTION_PLAN_VERIFICATION]: (
      <Co2Outlined fontSize="small" />
    ),
    [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: (
      <PublicOutlined fontSize="small" />
    ),
  };

const DEFAULT_SORT_MODEL: GridSortModel = [
  { field: "measurementYear", sort: "desc" },
];

const APPROVED_STATUSES = [
  CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED,
  CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
];

export const AwardsScreen: FC = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");

  const { data: organizations = [], isLoading: isLoadingOrgs } =
    useMyOrganizations();

  const defaultOrgId = organizations[0]?.id ?? "";
  const effectiveOrgId = selectedOrganizationId || defaultOrgId;

  const { data: recognitions = [], isLoading: isLoadingRecognitions } =
    useOrganizationRecognitions(
      effectiveOrgId,
      selectedYear || undefined,
      AWARD_SUBMISSION_TYPES
    );

  const { data: badgePreviews = [] } = useBadgePreviews(AWARD_BADGE_TYPES);

  const {
    data: approvedInventories = [],
    isLoading: isLoadingApprovedInventories,
  } = useCarbonInventoriesMinimalData(APPROVED_STATUSES);

  const availableYears = useMemo(() => {
    const orgInventories = approvedInventories.filter(
      (inv) => inv.organizationId === effectiveOrgId
    );
    const years = new Set(
      orgInventories.map((inv) => inv.year).filter((y) => y != null)
    );
    return Array.from(years).sort((a, b) => b - a);
  }, [approvedInventories, effectiveOrgId]);

  const previewMap = useMemo(
    () => new Map(badgePreviews.map((p) => [p.badgeType, p.previewUrl])),
    [badgePreviews]
  );

  const submissionTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of recognitions) {
      counts[r.submissionType] = (counts[r.submissionType] ?? 0) + 1;
    }
    return counts;
  }, [recognitions]);

  const selectedOrgName =
    organizations.find((o) => o.id === effectiveOrgId)?.name ?? "";

  if (!isLoadingOrgs && organizations.length === 0) {
    return (
      <ScreenEmptyState
        title={`Aún no tienes ${VOCAB.organization.noun.plural} creadas`}
        description={`Haz clic en el botón para crear tu primera ${VOCAB.organization.noun.singular}.`}
        action={{
          label: `Ir a Mi ${capitalize(VOCAB.organization.noun.singular)}`,
          onClick: () => navigate({ to: Routes.MY_ORGANIZATION }),
        }}
      />
    );
  }

  if (!isLoadingApprovedInventories && availableYears.length === 0) {
    return (
      <ScreenEmptyState
        title="Aún no tienes huellas con reconocimientos"
        description="Haz clic en el botón para gestionar tus huellas"
        action={{
          label: "Ir a Mis Huellas",
          onClick: () => navigate({ to: Routes.CARBON_INVENTORIES }),
        }}
      />
    );
  }

  const columns: GridColDef<GetOrganizationRecognitionsResponse[number]>[] = [
    {
      field: "earningDate",
      headerName: "Fecha otorgado",
      flex: 1,
      valueFormatter: (value: string) =>
        value
          ? new Date(value).toLocaleDateString("es", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "-",
    },
    {
      field: "measurementYear",
      headerName: "Año medición",
      flex: 1,
    },
    {
      field: "submissionType",
      headerName: "Reconocimiento",
      flex: 1.5,
      valueFormatter: (value: AwardSubmissionType) => SUBMISSION_LABELS[value],
    },
    {
      field: "totalEmissions",
      headerName: "Emisiones (tCO₂e)",
      flex: 1,
      valueFormatter: (value: number) =>
        value != null
          ? value.toLocaleString("es", { maximumFractionDigits: 0 })
          : "-",
    },
    {
      field: "actions",
      headerName: "Acciones",
      flex: 0.5,
      sortable: false,
      renderCell: (params) =>
        params.row.recognitionFileUrl ? (
          <Tooltip title="Ver reconocimiento" placement="top">
            <IconButton
              size="small"
              color="success"
              onClick={() =>
                window.open(
                  params.row.recognitionFileUrl!,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              title="Ver reconocimiento"
              sx={{
                border: 1,
                borderColor: "success.main",
                borderRadius: 1,
                p: "4px",
              }}
            >
              {SUBMISSION_ACTION_ICON[
                params.row.submissionType as AwardSubmissionType
              ] ?? <EmojiEventsOutlined fontSize="small" />}
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="No hay un reconocimiento disponible" placement="top">
            <EmojiEventsOutlined fontSize="small" color="disabled" />
          </Tooltip>
        ),
    },
  ];

  return (
    <Box className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <Box className="flex flex-row items-center justify-between gap-4 rounded-lg bg-white px-6 py-4">
        <Typography variant="h5" fontWeight={600}>
          {selectedOrgName}
        </Typography>
        <Box className="flex flex-wrap gap-3">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="year-select-label">Año</InputLabel>
            <Select
              labelId="year-select-label"
              label="Año"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {availableYears.map((year) => (
                <MenuItem key={year} value={String(year)}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <OrganizationSelector
            organizations={organizations}
            value={effectiveOrgId}
            onChange={setSelectedOrganizationId}
            isLoading={isLoadingOrgs}
            size="small"
            minWidth={200}
            label={capitalize(VOCAB.organization.noun.singular)}
          />
        </Box>
      </Box>

      {/* Summary cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 2,
        }}
      >
        {AWARD_SUBMISSION_TYPES.map((submissionType) => {
          const badgeType = SUBMISSION_TYPE_TO_BADGE_TYPE[submissionType];
          const previewUrl = previewMap.get(badgeType);
          const count = submissionTypeCounts[submissionType] ?? 0;
          return (
            <Box
              key={submissionType}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                px: 2.5,
                py: 2,
                borderRadius: 2,
                backgroundColor: SUBMISSION_CARD_COLORS[submissionType],
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={SUBMISSION_LABELS[submissionType]}
                  style={{
                    width: 56,
                    height: 56,
                    objectFit: "contain",
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <EmojiEventsOutlined
                  sx={{ fontSize: 48, color: "text.disabled", flexShrink: 0 }}
                />
              )}
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {SUBMISSION_LABELS[submissionType]}
                </Typography>
                <Typography variant="h4" fontWeight={700} color="text.primary">
                  {count > 0 ? count : "-"}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Table */}
      <Box className="flex w-full flex-col gap-4 rounded-lg bg-white p-6">
        <Typography variant="h6" fontWeight={600}>
          Reconocimientos
        </Typography>
        <StylizedDataGrid
          loading={isLoadingRecognitions}
          disableColumnSorting={false}
          columns={columns}
          rows={recognitions}
          getRowId={(row: GetOrganizationRecognitionsResponse[number]) =>
            `${row.submissionId}-${row.submissionType}`
          }
          initialState={{
            sorting: { sortModel: DEFAULT_SORT_MODEL },
          }}
        />
      </Box>
    </Box>
  );
};
